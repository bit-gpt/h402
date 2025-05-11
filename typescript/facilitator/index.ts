import { config } from "dotenv";
import express, { RequestHandler } from "express";
import { settle, verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, Hex, VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";
import queue from "bull";
import { logError } from "./utils.js";
import { LogContext } from "./types.js";

config();

const { PRIVATE_KEY, PORT, ADMIN_TOKEN, REDIS_PORT, REDIS_HOST } = process.env;

if (!PRIVATE_KEY || !PORT) {
  logError(
    { service: "facilitator", operation: "startup" },
    new Error("Missing environment variables"),
    "PRIVATE_KEY and PORT environment variables are required",
  );
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  logError(
    { service: "facilitator", operation: "startup" },
    new Error("Missing environment variable"),
    "ADMIN_TOKEN environment variable is required for security",
  );
  process.exit(1);
}

if (!REDIS_PORT || !REDIS_HOST) {
  logError(
    { service: "facilitator", operation: "startup" },
    new Error("Missing environment variables"),
    "REDIS_PORT and REDIS_HOST environment variables are required",
  );
  process.exit(1);
}

const redisConfig = {
  port: parseInt(REDIS_PORT),
  host: REDIS_HOST,
};

const txHashQueue = new queue("txHash", { redis: redisConfig });
const backupQueue = new queue("backup", { redis: redisConfig });

const app = express();
const port = parseInt(PORT);
app.use(express.json());

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.status(200).json({});
});

const adminRouter = express.Router();

adminRouter.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    authHeader.replace("Bearer ", "") !== ADMIN_TOKEN
  ) {
    logError(
      { service: "facilitator", operation: "admin-auth" },
      new Error("Invalid or missing token"),
      "Admin authentication failed",
    );
    res.status(401).json({ error: "Invalid or missing token" });
    return;
  }
  next();
});

adminRouter.post("/backup", async (_req, res) => {
  try {
    const job = await backupQueue.add("backup");
    await job.finished();
    res.status(200).json({});
  } catch (error) {
    logError({ service: "facilitator", operation: "manual-backup" }, error, "Manual backup failed");
    res.status(500).json({ error: "Backup failed" });
  }
});

app.use("/admin", adminRouter);

const errorResponse = (res: express.Response, status: number, error: string): void => {
  res.status(status).json({ error });
};

const handleTransactionQueue = async (
  txHash: string,
  operation: "check" | "insert",
  context: LogContext,
): Promise<void> => {
  try {
    const job = await txHashQueue.add(operation, { txHash });
    await job.finished();
  } catch (error: any) {
    if (error?.message?.includes("already exists")) {
      logError({ ...context, txHash }, error, "Transaction already used");
      throw new Error("Transaction already used");
    }
    logError({ ...context, txHash }, error, `Unexpected error processing ${operation}`);
    throw new Error("An internal error occurred");
  }
};

const verifyHandler: RequestHandler = async (req, res) => {
  const context: LogContext = { service: "facilitator", operation: "verify" };

  try {
    const { payload, paymentDetails } = req.body;

    if (!payload || !paymentDetails) {
      logError(
        context,
        new Error("Missing required fields"),
        "payload and paymentDetails required",
      );
      errorResponse(res, 400, "payload and paymentDetails required");
      return;
    }

    const verificationResult = await verify(payload, paymentDetails);
    if (
      verificationResult &&
      (!verificationResult.isValid || "errorMessage" in verificationResult)
    ) {
      logError(context, verificationResult, "Invalid verification");
      errorResponse(res, 400, verificationResult.errorMessage);
      return;
    }

    if ("txHash" in verificationResult) {
      try {
        await handleTransactionQueue(verificationResult.txHash, "check", context);

        if (verificationResult.type === "transaction") {
          await handleTransactionQueue(verificationResult.txHash, "insert", context);
        }

        res.status(200).json({ data: verificationResult } as FacilitatorResponse<VerifyResponse>);
        return;
      } catch (error: any) {
        if (error.message === "Transaction already used") {
          errorResponse(res, 400, error.message);
        } else {
          errorResponse(res, 500, error.message);
        }
        return;
      }
    }

    res.status(200).json({ data: verificationResult } as FacilitatorResponse<VerifyResponse>);
  } catch (error) {
    logError(context, error, "Unexpected error in verify endpoint");
    errorResponse(res, 500, "An internal error occurred");
  }
};

const settleHandler: RequestHandler = async (req, res) => {
  const context: LogContext = { service: "facilitator", operation: "settle" };

  try {
    const { payload, paymentDetails } = req.body;

    if (!payload || !paymentDetails) {
      logError(
        context,
        new Error("Missing required fields"),
        "payload and paymentDetails required",
      );
      errorResponse(res, 400, "payload and paymentDetails required");
      return;
    }

    const settleResult = await settle(payload, paymentDetails, PRIVATE_KEY as Hex);

    if (settleResult && "errorMessage" in settleResult) {
      logError(context, settleResult, "Settlement failed");
      res.status(400).json({ error: settleResult.errorMessage } as SettleResponse);
      return;
    }

    try {
      await handleTransactionQueue(settleResult.txHash, "insert", context);
      res.status(200).json({ success: true, txHash: settleResult.txHash } as SettleResponse);
    } catch (error: any) {
      if (error.message === "Transaction already used") {
        errorResponse(res, 400, error.message);
      } else {
        errorResponse(res, 500, error.message);
      }
    }
  } catch (error) {
    logError(context, error, "Unexpected error in settle endpoint");
    errorResponse(res, 500, "An internal error occurred");
  }
};

app.post("/verify", verifyHandler);
app.post("/settle", settleHandler);

app.listen(port, () => {
  console.log(`[FACILITATOR] Server listening at http://localhost:${port}`);
});

txHashQueue.on("error", (error: Error) => {
  logError({ service: "facilitator", operation: "queue" }, error, "Queue error");
});

backupQueue.on("error", (error: Error) => {
  logError({ service: "facilitator", operation: "backup-queue" }, error, "Backup queue error");
});

["SIGINT", "SIGTERM"].forEach(signal => {
  process.on(signal, async () => {
    console.log(`[FACILITATOR] ${signal} received, closing connections..`);
    await Promise.all([txHashQueue.close(), backupQueue.close()]);
    process.exit(0);
  });
});
