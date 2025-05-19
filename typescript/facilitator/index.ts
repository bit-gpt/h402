import { config } from "dotenv";
import express from "express";
import { settle, verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, Hex, VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";

config();
const { PRIVATE_KEY, PORT } = process.env;

if (!PRIVATE_KEY || !PORT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
const port = parseInt(PORT);

// Configure express to parse JSON bodies
app.use(express.json());

app.post("/verify", async (req: any, res: any) => {
  try {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator endpoint: verify");
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator payload:", req.body);

    const { payload, paymentRequirements } = req.body;

    if (!payload || !paymentRequirements) {
      return res.status(400).json({ error: "payload and paymentRequirements required" });
    }

    // Add more detailed logging before verification
    console.log(
      "[DEBUG-PAYMENT-FLOW] About to verify payment with payload length:",
      payload?.length || 0,
      "and requirements:",
      JSON.stringify(paymentRequirements),
    );

    const verificationResult = await verify(payload, paymentRequirements);

    console.log(
      "[DEBUG-PAYMENT-FLOW] Complete verification result:",
      JSON.stringify(verificationResult),
    );

    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      console.error(
        "[ERROR-PAYMENT-FLOW] Verification failed with message:",
        verificationResult.errorMessage,
      );
      return res.status(400).json({
        error: verificationResult.errorMessage,
      });
    }

    res.json({
      data: verificationResult,
      error: undefined,
    } as FacilitatorResponse<VerifyResponse>);
  } catch (error) {
    // More comprehensive error logging
    console.error("[ERROR-PAYMENT-FLOW] Exception during verification:", error);
    if (error instanceof Error) {
      console.error("[ERROR-PAYMENT-FLOW] Error name:", error.name);
      console.error("[ERROR-PAYMENT-FLOW] Error message:", error.message);
      console.error("[ERROR-PAYMENT-FLOW] Error stack:", error.stack);
    }
    res
      .status(500)
      .json({ error: "Server error during verification", details: (error as any).message });
  }
});

app.post("/settle", async (req: any, res: any) => {
  try {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator endpoint: settle");
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator payload:", req.body);

    const { payload, paymentRequirements } = req.body;

    if (!payload || !paymentRequirements) {
      return res.status(400).json({ error: "payload and paymentRequirements required" });
    }

    const settleResult = await settle(payload, paymentRequirements, PRIVATE_KEY as Hex);

    if ("errorMessage" in settleResult) {
      return res.status(400).json({
        error: settleResult.errorMessage,
        success: false,
      } as SettleResponse);
    }

    res.json({
      success: true,
      txHash: settleResult.txHash,
    } as SettleResponse);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Invalid request" });
  }
});

// Your Solana RPC endpoint - replace with your preferred node provider
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

// Add CORS middleware for the Solana RPC endpoint
app.options("/solana-rpc", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Solana-Client");
  res.status(200).send();
});

app.post("/solana-rpc", async (req, res) => {
  try {
    // Set CORS headers
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Solana-Client");

    // Forward the RPC request to Solana using fetch
    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Return the response from Solana
    res.json(data);
  } catch (error) {
    console.error("Error proxying request:", error);
    res.status(500).json({
      error: "Error proxying request to Solana RPC",
      details: (error as any).message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
