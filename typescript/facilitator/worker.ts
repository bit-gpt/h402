import Queue from "bull";
import Database from "better-sqlite3";
import path from "path";
import { config } from "dotenv";
import fsExtra from "fs-extra";
import cron from "node-cron";
import { Client as MinioClient, BucketItem } from "minio";
import { TransactionExistsError, LogContext } from "./types.js";
import { logError } from "./utils.js";

config();

const DATA_DIR = "/data";
const DB_PATH = path.join(DATA_DIR, "facilitator.db");
const {
  BACKUP_SCHEDULE,
  KEEP_BACKUPS,
  S3_ENDPOINT,
  S3_ACCESS_KEY,
  S3_SECRET_KEY,
  S3_BUCKET,
  REDIS_PORT,
  REDIS_HOST,
} = process.env;

if (
  !BACKUP_SCHEDULE ||
  !KEEP_BACKUPS ||
  !S3_ENDPOINT ||
  !S3_ACCESS_KEY ||
  !S3_SECRET_KEY ||
  !S3_BUCKET ||
  !REDIS_PORT ||
  !REDIS_HOST
) {
  logError(
    { service: "worker", operation: "startup" },
    new Error("Missing environment variables"),
    "Required environment variables are not set",
  );
  process.exit(1);
}

const redisConfig = {
  port: parseInt(REDIS_PORT),
  host: REDIS_HOST,
};

let db: Database.Database;
let checkStmt: Database.Statement;
let insertStmt: Database.Statement;

try {
  db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS txHashes (
      txHash TEXT PRIMARY KEY,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_txHashes_createdAt ON txHashes(createdAt);
  `);

  // Prepare statements once
  checkStmt = db.prepare("SELECT 1 FROM txHashes WHERE txHash = ?");
  insertStmt = db.prepare("INSERT INTO txHashes (txHash) VALUES (?)");

  console.log("[WORKER] Database initialized successfully");
} catch (error) {
  logError({ service: "worker", operation: "startup" }, error, "Database initialization failed");
  process.exit(1);
}

let s3Client: MinioClient | null = null;

if (S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET) {
  try {
    s3Client = new MinioClient({
      endPoint: S3_ENDPOINT,
      accessKey: S3_ACCESS_KEY,
      secretKey: S3_SECRET_KEY,
    });
    console.log(`[WORKER] S3 storage configured: ${S3_ENDPOINT}, bucket: ${S3_BUCKET}`);
  } catch (error) {
    logError({ service: "worker", operation: "startup" }, error, "Failed to initialize S3 client");
  }
}

const txHashQueue = new Queue("txHash", { redis: redisConfig });
const backupQueue = new Queue("backup", { redis: redisConfig });

const handleTransactionExists = (txHash: string, operation: string, jobId: string | number) => {
  const error = new TransactionExistsError(txHash);
  logError(
    { service: "worker", operation, txHash, jobId },
    error,
    `Transaction already exists during ${operation}`,
  );
  throw error;
};

txHashQueue.process("check", async job => {
  const { txHash } = job.data;
  console.log(`[WORKER] Checking if txHash exists:`, txHash);

  const exists = checkStmt.get(txHash);
  if (exists) {
    handleTransactionExists(txHash, "check", job.id);
  }

  console.log(`[WORKER] txHash not found during check:`, txHash);
  return { exists: false };
});

txHashQueue.process("insert", async job => {
  const { txHash } = job.data;
  console.log(`[WORKER] Processing insert for txHash:`, txHash);

  try {
    insertStmt.run(txHash);
    console.log(`[WORKER] Transaction hash stored successfully:`, txHash);
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      const sqliteError = error as { code?: string };
      if (sqliteError.code === "SQLITE_CONSTRAINT") {
        handleTransactionExists(txHash, "insert", job.id);
      }
    }
    logError(
      { service: "worker", operation: "insert", txHash, jobId: job.id },
      error,
      "Failed to insert transaction",
    );
    throw error;
  }
});

backupQueue.process("backup", async () => {
  if (!s3Client || !S3_BUCKET) {
    const error = new Error("S3 client not initialized");
    logError(
      { service: "worker", operation: "backup" },
      error,
      "Backup failed - S3 client not initialized",
    );
    throw error;
  }

  let tempBackupPath: string | null = null;

  try {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupFileName = `facilitator-${timestamp}.db.bak`;
    tempBackupPath = path.join(DATA_DIR, backupFileName);

    db.pragma("wal_checkpoint(FULL)");
    await fsExtra.copy(DB_PATH, tempBackupPath);
    console.log(`[WORKER] Database snapshot created: ${tempBackupPath}`);

    await s3Client.fPutObject(S3_BUCKET, backupFileName, tempBackupPath, {
      "Content-Type": "application/octet-stream",
    });
    console.log(`[WORKER] Backup uploaded to S3: ${S3_BUCKET}/${backupFileName}`);

    await cleanupOldBackups();
    return { success: true };
  } catch (error) {
    logError({ service: "worker", operation: "backup" }, error, "Database backup failed");
    throw error;
  } finally {
    if (tempBackupPath) {
      try {
        await fsExtra.remove(tempBackupPath);
        console.log(`[WORKER] Temporary backup file removed: ${tempBackupPath}`);
      } catch (cleanupError) {
        logError(
          { service: "worker", operation: "backup-cleanup" },
          cleanupError,
          `Failed to remove temporary backup file: ${tempBackupPath}`,
        );
      }
    }
  }
});

const cleanupOldBackups = async (): Promise<void> => {
  if (!s3Client || !S3_BUCKET) return;

  try {
    const keepBackupsCount = parseInt(KEEP_BACKUPS, 10);
    if (isNaN(keepBackupsCount) || keepBackupsCount <= 0) {
      logError(
        { service: "worker", operation: "backup-cleanup" },
        new Error(`Invalid KEEP_BACKUPS value: ${KEEP_BACKUPS}`),
        "Skipping backup cleanup due to invalid configuration",
      );
      return;
    }

    const backups: BucketItem[] = [];
    const objects = await s3Client.listObjects(S3_BUCKET, "", true);

    // Collect all backups in a single pass
    await new Promise<void>((resolve, reject) => {
      objects.on("data", (obj: BucketItem) => {
        if (obj.name?.endsWith(".db.bak")) {
          backups.push(obj);
        }
      });
      objects.on("end", resolve);
      objects.on("error", reject);
    });

    if (backups.length <= keepBackupsCount) {
      console.log(`[WORKER] No backups to clean up (${backups.length} <= ${keepBackupsCount})`);
      return;
    }

    // Sort and delete in a single batch
    const toDelete = backups
      .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
      .slice(keepBackupsCount);

    console.log(
      `[WORKER] Cleaning up ${toDelete.length} old backups (keeping ${keepBackupsCount})`,
    );

    await Promise.all(
      toDelete.map(async backup => {
        if (backup.name) {
          try {
            await s3Client!.removeObject(S3_BUCKET, backup.name);
            console.log(`[WORKER] Removed old backup: ${backup.name}`);
          } catch (error) {
            logError(
              { service: "worker", operation: "backup-cleanup", backup: backup.name },
              error,
              "Failed to remove backup",
            );
          }
        }
      }),
    );
  } catch (error) {
    logError(
      { service: "worker", operation: "backup-cleanup" },
      error,
      "Failed to clean up old backups",
    );
  }
};

if (cron.validate(BACKUP_SCHEDULE)) {
  cron.schedule(BACKUP_SCHEDULE, async () => {
    console.log(`[WORKER] Running scheduled backup at ${new Date().toISOString()}`);
    try {
      await backupQueue.add("backup", {}, { jobId: `backup-${Date.now()}` });
    } catch (error) {
      logError(
        { service: "worker", operation: "scheduled-backup" },
        error,
        "Unhandled error in scheduled backup",
      );
    }
  });
  console.log(`[WORKER] Scheduled backups configured: ${BACKUP_SCHEDULE}`);
} else {
  logError(
    { service: "worker", operation: "startup" },
    new Error(`Invalid cron schedule pattern: ${BACKUP_SCHEDULE}`),
    "Invalid backup schedule configuration",
  );
}

txHashQueue.on("failed", (job, error) => {
  const context: LogContext = {
    service: "worker",
    operation: "queue-job",
    txHash: job.data.txHash,
    jobId: job.id,
    jobType: job.name,
  };

  if (error instanceof TransactionExistsError) {
    logError(context, error, "Transaction already exists");
  } else {
    logError(context, error, "Job failed");
  }
});

txHashQueue.on("error", error => {
  logError({ service: "worker", operation: "queue" }, error, "Queue error");
});

backupQueue.on("error", error => {
  logError({ service: "worker", operation: "backup-queue" }, error, "Backup queue error");
});

backupQueue.on("failed", (job, error) => {
  logError(
    {
      service: "worker",
      operation: "backup-job",
      jobId: job.id,
    },
    error,
    "Backup job failed",
  );
});

["SIGINT", "SIGTERM"].forEach(signal => {
  process.on(signal, async () => {
    console.log(`[WORKER] ${signal} received, closing connections...`);
    await Promise.all([txHashQueue.close(), backupQueue.close()]);
    db?.close();
    process.exit(0);
  });
});

console.log("[WORKER] Started successfully");
