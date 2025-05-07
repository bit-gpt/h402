import { config } from "dotenv";
import express from "express";
import { settle, verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, Hex, VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import fsExtra from "fs-extra";
import cron from "node-cron";
import { Client as MinioClient, BucketItem } from "minio";

config();

const DATA_DIR = "/data";
const DB_PATH = path.join(DATA_DIR, "facilitator.db");
const {
  PRIVATE_KEY,
  PORT,
  BACKUP_SCHEDULE = "0 0 * * *",
  KEEP_BACKUPS = "7",
  ADMIN_TOKEN,
  S3_ENDPOINT,
  S3_ACCESS_KEY,
  S3_SECRET_KEY,
  S3_BUCKET,
} = process.env;

if (!PRIVATE_KEY || !PORT) {
  console.error("Error: PRIVATE_KEY and PORT environment variables are required");
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error("Error: ADMIN_TOKEN environment variable is required for security");
  process.exit(1);
}

let s3Client: MinioClient | null = null;

if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_BUCKET) {
  console.error(
    "Error: S3 configuration is required for backups (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)",
  );
  process.exit(1);
}

try {
  s3Client = new MinioClient({
    endPoint: S3_ENDPOINT,
    accessKey: S3_ACCESS_KEY,
    secretKey: S3_SECRET_KEY,
  });
  console.log(`S3 storage configured: ${S3_ENDPOINT}, bucket: ${S3_BUCKET}`);
} catch (error) {
  console.error("Failed to initialize S3 client:", error);
  process.exit(1);
}

console.log(`Database: ${DB_PATH} (Backup schedule: ${BACKUP_SCHEDULE}, Keep: ${KEEP_BACKUPS})`);

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  } catch (err) {
    console.error(`Failed to create directory ${DATA_DIR}:`, err);
    process.exit(1);
  }
}

let db: Database.Database;

try {
  db = new Database(DB_PATH);
  db.exec(`
      CREATE TABLE IF NOT EXISTS txHashes (
        txHash TEXT PRIMARY KEY,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_txHashes_createdAt ON txHashes(createdAt);
    `);
  console.log("Database initialized successfully");
} catch (error) {
  console.error(`Database initialization error:`, error);
}

const initializeS3Bucket = async () => {
  if (!s3Client || !S3_BUCKET) return false;

  try {
    const bucketExists = await s3Client.bucketExists(S3_BUCKET);
    if (!bucketExists) {
      await s3Client.makeBucket(S3_BUCKET);
      console.log(`Created S3 bucket: ${S3_BUCKET}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to initialize S3 bucket:", error);
    process.exit(1);
  }
};

initializeS3Bucket().catch(err => {
  console.error("S3 initialization error:", err);
  process.exit(1);
});

const backupDatabase = async (): Promise<{ success: boolean; error?: unknown }> => {
  if (!s3Client || !S3_BUCKET) {
    console.error("S3 client not initialized, cannot perform backup");
    return { success: false, error: "S3 client not initialized" };
  }

  let tempBackupPath: string | null = null;

  try {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupFileName = `facilitator-${timestamp}.db.bak`;
    tempBackupPath = path.join(DATA_DIR, backupFileName);

    db.pragma("wal_checkpoint(FULL)");
    await fsExtra.copy(DB_PATH, tempBackupPath);
    console.log(`Database snapshot created: ${tempBackupPath}`);

    await s3Client.fPutObject(S3_BUCKET, backupFileName, tempBackupPath, {
      "Content-Type": "application/octet-stream",
    });
    console.log(`Backup uploaded to S3: ${S3_BUCKET}/${backupFileName}`);

    await cleanupOldBackups();

    return { success: true };
  } catch (error) {
    console.error("Database backup failed:", error);
    return { success: false, error };
  } finally {
    if (tempBackupPath) {
      try {
        await fsExtra.remove(tempBackupPath);
        console.log(`Temporary backup file removed: ${tempBackupPath}`);
      } catch (cleanupError) {
        console.error(`Failed to remove temporary backup file: ${tempBackupPath}`, cleanupError);
      }
    }
  }
};

const cleanupOldBackups = async (): Promise<void> => {
  if (!s3Client || !S3_BUCKET) return;

  try {
    const keepBackupsCount = parseInt(KEEP_BACKUPS, 10);
    if (isNaN(keepBackupsCount) || keepBackupsCount <= 0) {
      console.log(`Skipping backup cleanup (KEEP_BACKUPS=${KEEP_BACKUPS})`);
      return;
    }

    const objects = await s3Client.listObjects(S3_BUCKET, "", true);
    const backups: BucketItem[] = [];

    objects.on("data", (obj: BucketItem) => {
      if (obj.name && obj.name.endsWith(".db.bak")) {
        backups.push(obj);
      }
    });

    await new Promise<void>(resolve => {
      objects.on("end", () => {
        resolve();
      });
    });

    if (backups.length <= keepBackupsCount) {
      console.log(`No backups to clean up (${backups.length} <= ${keepBackupsCount})`);
      return;
    }

    backups.sort((a: BucketItem, b: BucketItem) => {
      const dateA = a.lastModified?.getTime() || 0;
      const dateB = b.lastModified?.getTime() || 0;
      return dateB - dateA;
    });

    const toDelete = backups.slice(keepBackupsCount);
    console.log(`Cleaning up ${toDelete.length} old backups (keeping ${keepBackupsCount})`);

    for (const backup of toDelete) {
      if (backup.name) {
        await s3Client.removeObject(S3_BUCKET, backup.name);
        console.log(`Removed old backup: ${backup.name}`);
      }
    }
  } catch (error) {
    console.error("Failed to clean up old backups:", error);
  }
};

if (cron.validate(BACKUP_SCHEDULE)) {
  cron.schedule(BACKUP_SCHEDULE, async () => {
    console.log(`Running scheduled backup at ${new Date().toISOString()}`);
    try {
      const result = await backupDatabase();
      if (result.success) {
        console.log("Scheduled backup completed successfully");
      } else {
        console.error("Scheduled backup failed:", result.error);
      }
    } catch (error) {
      console.error("Unhandled error in scheduled backup:", error);
    }
  });
  console.log(`Scheduled backups configured: ${BACKUP_SCHEDULE}`);
} else {
  console.error(`Invalid cron schedule pattern: ${BACKUP_SCHEDULE}`);
}

const app = express();
const port = parseInt(PORT);
app.use(express.json());

app.get("/health", (res: express.Response) => {
  try {
    res.json({
      status: "ok",
      database: "connected",
      path: DB_PATH,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "error", message: "Database connection failed", path: DB_PATH });
  }
});

const adminRouter = express.Router();
// @ts-ignore
adminRouter.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.substring(7) !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing admin token" });
  }
  next();
});

adminRouter.post("/backup", async (req, res) => {
  try {
    const result = await backupDatabase();
    if (result.success) {
      res.json({ status: "ok", message: "Backup completed successfully" });
    } else {
      res.status(500).json({ status: "error", message: "Backup failed", error: result.error });
    }
  } catch (error) {
    console.error("Manual backup failed:", error);
    res.status(500).json({ status: "error", message: "Backup failed" });
  }
});

app.use("/admin", adminRouter);

// @ts-ignore
app.post("/verify", async (req: express.Request, res: express.Response) => {
  try {
    const { payload, paymentDetails } = req.body;

    if (!payload || !paymentDetails) {
      return res.status(400).json({ error: "payload and paymentDetails required" });
    }

    const verificationResult = await verify(payload, paymentDetails);
    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      return res.status(400).json({ verificationResult });
    }

    if ("txHash" in verificationResult) {
      try {
        const stmt = db.prepare("INSERT INTO txHashes (txHash) VALUES (?)");
        stmt.run(verificationResult.txHash);
        console.log(`Transaction hash stored: ${verificationResult.txHash}`);
      } catch (error: any) {
        if (error.code === "SQLITE_CONSTRAINT") {
          console.error(`Transaction already used: ${verificationResult.txHash}`);
          return res.status(400).json({ error: "Transaction already used" });
        }
        console.error("Database error:", error);
        throw error;
      }
    }

    res.json({ data: verificationResult, error: undefined } as FacilitatorResponse<VerifyResponse>);
  } catch (error) {
    console.error("Error in verify route:", error);
    res.status(500).json({ error: "Server error processing verification" });
  }
});

// @ts-ignore
app.post("/settle", async (req: express.Request, res: express.Response) => {
  try {
    const { payload, paymentDetails } = req.body;

    if (!payload || !paymentDetails) {
      return res.status(400).json({ error: "payload and paymentDetails required" });
    }

    const settleResult = await settle(payload, paymentDetails, PRIVATE_KEY as Hex);

    if ("errorMessage" in settleResult) {
      return res
        .status(400)
        .json({ error: settleResult.errorMessage, success: false } as SettleResponse);
    }

    try {
      const exists = db.prepare("SELECT 1 FROM txHashes WHERE txHash = ?").get(settleResult.txHash);
      if (!exists) {
        db.prepare("INSERT INTO txHashes (txHash) VALUES (?)").run(settleResult.txHash);
        console.log(`Settlement hash stored: ${settleResult.txHash}`);
      }
    } catch (error) {
      console.warn(`Could not record settlement transaction: ${settleResult.txHash}`, error);
    }

    res.json({ success: true, txHash: settleResult.txHash } as SettleResponse);
  } catch (error) {
    console.error("Error in settle route:", error);
    res.status(500).json({ error: "Server error processing settlement" });
  }
});

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));

["SIGINT", "SIGTERM"].forEach(signal => {
  process.on(signal, () => {
    console.log(`${signal} received, closing database connection...`);
    db?.close();
    process.exit(0);
  });
});
