import axios, { AxiosError } from "axios";
import fs from "fs";
import { config } from "dotenv";
import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { withPaymentInterceptor, decodeXPaymentResponse } from "h402-axios";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import type { TransactionModifyingSigner } from "@solana/signers";
import type { Transaction } from "@solana/transactions";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. http://localhost:3000
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /image

if (!baseURL || !evmPrivateKey || !endpointPath) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// EVM client
const evmAccount = privateKeyToAccount(evmPrivateKey);
const evmClient = createWalletClient({
  account: evmAccount,
  transport: http(),
  chain: bsc,
}).extend(publicActions);

// Solana client
const solanaKeypair = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
const solanaClient = {
  publicKey: solanaKeypair.publicKey.toBase58(),
  signTransaction: async <T extends Transaction>(
    transactions: readonly T[],
  ): Promise<readonly T[]> => {
    const signer = await createKeyPairSignerFromBytes(solanaKeypair.secretKey);
    const signatures = await signer.signTransactions(transactions);
    const modifiedTransactions = transactions.map((transaction, index) => {
      const signature = signatures[index];
      if (!signature || Object.keys(signature).length === 0) {
        throw new Error(`Failed to sign transaction at index ${index}`);
      }
      return {
        ...transaction,
        signatures: {
          ...transaction.signatures,
          ...signature,
        },
      } as T;
    });
    return modifiedTransactions;
  },
} satisfies {
  publicKey: string;
  signTransaction: TransactionModifyingSigner["modifyAndSignTransactions"];
};

// Create the API client with payment interceptor
// If multiple clients are provided, the payment interceptor will use the first one that is available according to payment requirements
// You can comment out the evmClient to test the solana client
const api = withPaymentInterceptor(
  axios.create({
    baseURL,
  }),
  {
    evmClient,
    solanaClient,
  },
);

/**
 * Main function that handles the image generation flow
 */
async function main() {
  try {
    // Step 1: Make the initial request to trigger image generation and payment flow
    const response = await api.get(endpointPath);

    console.log("Response status:", response.status);
    console.log("Response data:", response.data);

    // Check if we have a payment response header
    const paymentResponseHeader = response.headers["x-payment-response"];
    if (paymentResponseHeader) {
      try {
        const paymentResponse = decodeXPaymentResponse(paymentResponseHeader);
        console.log("Payment response:", paymentResponse);
      } catch (error) {
        console.log("Error decoding payment response:", error);
      }
    }

    // Step 2: Extract the request ID from the response
    if (!response.data?.requestId) {
      throw new Error("No request ID in response");
    }

    const requestId = response.data.requestId;
    console.log("Request ID:", requestId);

    // Step 3: Poll for image generation status
    console.log("Polling for image status...");
    const filename = await pollImageStatus(requestId);
    console.log("Image generation completed with filename:", filename);

    // Step 4: Fetch the generated image
    console.log("Fetching image...");
    const imageData = await fetchImage(filename);
    console.log(`Image fetched successfully (${imageData.length} bytes)`);

    // Step 5: Save the image locally
    const outputPath = `./data/generated-image-${Date.now()}.jpg`;
    fs.writeFileSync(outputPath, imageData);
    console.log(`Image saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error in main process:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    if (error instanceof AxiosError && error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

/**
 * Polls for image generation status
 *
 * @param requestId - The ID of the image generation request
 * @param maxRetries - Maximum number of retry attempts
 * @param delay - Delay between retries in milliseconds
 * @returns The filename of the generated image
 */
async function pollImageStatus(requestId: string, maxRetries = 15, delay = 2000): Promise<string> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Checking status (attempt ${retries + 1}/${maxRetries})...`);
      const statusResponse = await api.get(`/api/generate-image/status/${requestId}`);

      if (statusResponse.data.status === "completed" && statusResponse.data.filename) {
        return statusResponse.data.filename;
      } else if (statusResponse.data.status === "failed") {
        throw new Error(statusResponse.data.error || "Image generation failed");
      }

      console.log(`Status: ${statusResponse.data.status || "processing"}`);

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    } catch (error) {
      console.error("Error checking status:", error);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }

  throw new Error("Timed out waiting for image generation");
}

/**
 * Fetches the image data
 *
 * @param filename - The filename of the image to fetch
 * @returns A Buffer containing the image data
 */
async function fetchImage(filename: string): Promise<Buffer> {
  const imageResponse = await api.get(`/uploads/${filename}`, {
    responseType: "arraybuffer",
  });

  return Buffer.from(imageResponse.data);
}

// Run the main function
main();
