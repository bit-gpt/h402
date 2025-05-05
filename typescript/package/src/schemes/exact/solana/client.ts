import {
  createSolanaRpc,
  address,
  createTransactionMessage,
  appendTransactionMessageInstruction,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  compileTransaction,
  pipe,
  type CompilableTransactionMessage,
  type TransactionMessageWithBlockhashLifetime,
  Blockhash,
  signature as solanaSignature,
  type Base64EncodedWireTransaction,
} from "@solana/kit";
import {
  getTransferInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
} from "@solana-program/token";
import {
  getTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system";
import { getAddMemoInstruction } from "@solana-program/memo";
import { PaymentDetails, PaymentPayload } from "../../../types/index.js";
import { SolanaClient } from "../../../types/payment.js";
import { getAssociatedTokenAddress } from "../../../shared/solana/tokenAddress.js";
import { createAddressSigner } from "../../../shared/solana/signers.js";
import { getClusterUrl } from "../../../shared/solana/clusterEndpoints.js";
import bs58 from "bs58";

// Define the minimal RPC interface needed for payment processing
// This allows us to use a proxied RPC client that only implements these methods
type MinimalRpc = Pick<
  ReturnType<typeof createSolanaRpc>,
  "getLatestBlockhash" | "getSignatureStatuses" | "sendTransaction"
>;

/**
 * Create a dedicated function for better object logging
 */
function logObject(obj: any): string {
  try {
    if (obj === null || obj === undefined) {
      return String(obj);
    }

    if (typeof obj === "object") {
      // Check for toString method that's not the default Object.prototype.toString
      if ("toString" in obj && obj.toString !== Object.prototype.toString) {
        const strValue = obj.toString();
        if (strValue !== "[object Object]") {
          return strValue;
        }
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        if (obj.length === 0) return "[]";

        return `[${obj.map((item) => logObject(item)).join(", ")}]`;
      }

      // Handle objects with circular references
      const seen = new WeakSet();
      const stringifyObject = (obj: any, depth = 0): string => {
        if (depth > 2) return "{ ... }"; // Limit depth

        if (seen.has(obj)) return "{ [Circular] }";
        seen.add(obj);

        const entries = Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (typeof v === "object" && v !== null) {
              return `${k}: ${stringifyObject(v, depth + 1)}`;
            }
            return `${k}: ${logObject(v)}`;
          });

        return `{ ${entries.join(", ")} }`;
      };

      return stringifyObject(obj);
    }

    // Handle primitives
    if (typeof obj === "string") return obj;
    if (
      typeof obj === "number" ||
      typeof obj === "boolean" ||
      typeof obj === "bigint"
    ) {
      return obj.toString();
    }
    if (typeof obj === "function") return "[Function]";

    // Fallback
    return String(obj);
  } catch (error) {
    return `[Error stringifying object: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Create a memo instruction with the resource ID and optional nonce
 */
function createMemoInstruction(
  payerSigner: ReturnType<typeof createAddressSigner>,
  resource: string,
  nonce?: string
) {
  // Create memo text with optional nonce for uniqueness
  const memoText = nonce ? `${resource}:${nonce}` : resource;
  console.log("Creating memo instruction with memo:", memoText);

  // Use the memo program to add a memo to the transaction
  return getAddMemoInstruction({
    memo: memoText,
    signers: [payerSigner], // Fix: use signers array instead of signer property
  });
}

/**
 * Build a Solana transaction for the exact payment scheme
 * Supports both native SOL and SPL tokens
 */
async function buildPaymentTransaction(
  paymentDetails: PaymentDetails,
  payerPublicKey: string,
  rpc: MinimalRpc,
  nonce?: string,
  existingBlockhash?: Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
  }>
): Promise<
  CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime
> {
  // Get the latest blockhash if not provided
  const latestBlockhash =
    existingBlockhash || (await rpc.getLatestBlockhash().send()).value;

  console.log("Latest blockhash:", latestBlockhash);

  // Create a signer from the payer's public key
  const payerSigner = createAddressSigner(address(payerPublicKey));

  // Get the recipient address
  const payToAddress = address(paymentDetails.payToAddress);

  // Get the amount to transfer
  const amount = paymentDetails.amountRequired;

  // Create a transaction message
  const txMessage = pipe(
    // Create a new transaction message
    createTransactionMessage({ version: 0 }),

    // Set the fee payer
    (tx) => setTransactionMessageFeePayer(payerSigner.address, tx),

    // Set the blockhash
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),

    // Add payment instruction
    (tx) => {
      // Check if this is a native SOL transfer or an SPL token transfer
      if (
        !paymentDetails.tokenAddress ||
        paymentDetails.tokenAddress === SYSTEM_PROGRAM_ADDRESS.toString()
      ) {
        // Native SOL transfer
        console.log("Native SOL transfer instruction:", {
          accounts: [
            { address: payerSigner.address.toString() },
            { address: payToAddress.toString() },
          ],
          programAddress: SYSTEM_PROGRAM_ADDRESS.toString(),
          data: amount.toString(),
        });

        // Create a transfer instruction
        const transferInstruction = getTransferSolInstruction({
          source: payerSigner,
          destination: payToAddress,
          amount: BigInt(amount.toString()),
        });

        return appendTransactionMessageInstruction(transferInstruction, tx);
      } else {
        // SPL token transfer
        try {
          const mint = address(paymentDetails.tokenAddress);
          console.log(
            `Processing SPL token transfer for mint: ${mint.toString()}`
          );

          // Get the sender's and receiver's Associated Token Accounts (ATAs)
          const senderATA = getAssociatedTokenAddress(
            mint.toString(),
            payerPublicKey
          );

          const receiverATA = getAssociatedTokenAddress(
            mint.toString(),
            payToAddress.toString()
          );

          console.log(`Sender ATA: ${senderATA.toString()}`);
          console.log(`Receiver ATA: ${receiverATA.toString()}`);

          // Create an idempotent instruction to create the receiver's ATA if it doesn't exist
          const createAtaInstruction =
            getCreateAssociatedTokenIdempotentInstruction({
              payer: payerSigner,
              mint: address(mint.toString()),
              owner: address(payToAddress.toString()),
              ata: address(receiverATA.toString()),
            });

          // Add token transfer instruction using the token program client with proper signer
          const transferInstruction = getTransferInstruction({
            source: address(senderATA.toString()),
            destination: address(receiverATA.toString()),
            authority: payerSigner,
            amount: BigInt(amount.toString()),
          });

          // First add the create ATA instruction (idempotent, will do nothing if ATA exists)
          tx = appendTransactionMessageInstruction(createAtaInstruction, tx);
          // Then add the transfer instruction
          return appendTransactionMessageInstruction(transferInstruction, tx);
        } catch (error: unknown) {
          console.error(
            "Error creating SPL token transfer instructions:",
            error
          );
          throw new Error(
            `Failed to create SPL token transfer instructions: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    },

    // Add memo instruction with resource ID and optional nonce
    (tx) => {
      try {
        // Create a memo instruction
        const memoInstruction = createMemoInstruction(
          payerSigner,
          paymentDetails.resource,
          nonce
        );
        return appendTransactionMessageInstruction(memoInstruction, tx);
      } catch (error: unknown) {
        console.error("Error creating memo instruction:", error);
        if (error instanceof Error) {
          throw new Error(
            `Failed to create memo instruction: ${error.message}`
          );
        } else {
          throw new Error(
            `Failed to create memo instruction: ${String(error)}`
          );
        }
      }
    }
  );

  // Log the final transaction message structure
  console.debug(
    "Final transaction message:",
    JSON.stringify(
      {
        version: txMessage.version,
        instructions: txMessage.instructions.map((inst: any) => ({
          programAddress: inst.programAddress.toString(),
          accounts: inst.accounts
            ? inst.accounts.map((a: any) => ({
                pubkey: a.pubkey
                  ? typeof a.pubkey === "string"
                    ? a.pubkey
                    : a.pubkey.toString()
                  : a.address
                    ? a.address.toString()
                    : "undefined",
                isSigner: a.isSigner,
                isWritable: a.isWritable,
              }))
            : [],
        })),
      },
      null,
      2
    )
  );

  // Return the transaction message
  return txMessage;
}

/**
 * Send a payment transaction and return the payload for the h402 header
 */
async function sendAndCreatePayload(
  transactionMessage: CompilableTransactionMessage &
    TransactionMessageWithBlockhashLifetime,
  rpc: MinimalRpc,
  client: SolanaClient,
  resource: string,
  networkId: string = "mainnet"
): Promise<PaymentPayload<any>> {
  console.log("Sending payment transaction");

  try {
    // Compile the transaction message into a transaction
    const transaction = compileTransaction(transactionMessage);

    // Extract memo from transaction if present
    let memo: string | undefined = resource;

    // Track the transaction signature
    let txSignature: string;

    // Create a function to wait for transaction confirmation
    const waitForConfirmation = async (sig: string) => {
      console.log(`Waiting for confirmation of transaction: ${sig}`);
      // Use getSignatureStatuses instead of getSignatureStatus
      return rpc
        .getSignatureStatuses([solanaSignature(sig)], {
          searchTransactionHistory: true,
        })
        .send();
    };

    console.log("Signing and sending transaction...");

    // Handle different wallet adapter interfaces
    if (typeof client.signTransaction === "function") {
      console.log("Using signTransaction then manually sending");
      // Sign then send manually
      const signedTx = await client.signTransaction([transaction]);
      console.log("Transaction signed successfully");
      // Convert the messageBytes to a base64-encoded string for the sendTransaction method
      const base64EncodedWireTransaction = Buffer.from(
        signedTx[0].messageBytes
      ).toString("base64") as unknown as Base64EncodedWireTransaction;

      const response = await rpc
        .sendTransaction(base64EncodedWireTransaction)
        .send();
      console.log("Transaction send response:", response);

      // Handle different response formats safely
      if (typeof response === "string") {
        txSignature = response;
      } else if (response && typeof response === "object") {
        // Use safe type checking
        const responseObj = response as any;
        if (responseObj && responseObj.value) {
          txSignature = responseObj.value.toString();
        } else if (responseObj && responseObj.signature) {
          txSignature = responseObj.signature.toString();
        } else {
          throw new Error(
            "Could not extract transaction signature from response"
          );
        }
      } else {
        throw new Error("Invalid response from sendTransaction");
      }

      console.log(`Transaction sent with signature: ${txSignature}`);

      // Wait for confirmation
      await waitForConfirmation(txSignature);
    } else if (typeof client.signAndSendTransaction === "function") {
      console.log("Using client's signAndSendTransaction method");
      // Wallet with combined sign and send method
      const signatureArray = await client.signAndSendTransaction([transaction]);

      // According to the wallet standard, we should receive an array of SignatureBytes
      if (!Array.isArray(signatureArray) || signatureArray.length === 0) {
        throw new Error(
          "Invalid response from signAndSendTransaction: Expected non-empty array of signatures"
        );
      }

      // Get the first signature (we only sent one transaction)
      const signatureBytes = signatureArray[0];

      // Convert SignatureBytes (Uint8Array) to a base58 string
      // Using a correctly imported bs58 module
      const base58Signature = bs58.encode(Buffer.from(signatureBytes));

      // Now create a valid Solana signature from the base58 string
      txSignature = solanaSignature(base58Signature);

      console.log(`Transaction sent with signature: ${txSignature}`);

      // Wait for confirmation
      await waitForConfirmation(txSignature);
    } else {
      throw new Error(
        "Signer must implement either sendTransaction, signTransaction, or signAndSendTransaction"
      );
    }

    // Create the payment payload
    const payload: PaymentPayload<any> = {
      version: 1,
      scheme: "exact",
      namespace: "solana",
      networkId,
      resource,
      payload: {
        type: "transaction",
        signature: txSignature,
        memo,
      },
    };

    console.log("Payment payload created:", payload);
    return payload;
  } catch (error) {
    console.error("Error sending payment transaction:", error);
    throw new Error(
      `Failed to send payment transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a payment for the Solana blockchain using the exact payment scheme
 * @param client The Solana client with publicKey, signAndSendTransaction method, and optional rpc
 * @param paymentDetails The payment details including amount, recipient, etc.
 * @returns Base64 encoded payment payload string
 */
async function createPayment(
  client: SolanaClient,
  paymentDetails: PaymentDetails
): Promise<string> {
  try {
    // Validate required fields
    if (!client.publicKey) {
      throw new Error("Client must have a publicKey");
    }

    if (!paymentDetails.payToAddress) {
      throw new Error("Payment details must include a payToAddress");
    }

    if (paymentDetails.amountRequired === undefined) {
      throw new Error("Payment details must include an amountRequired");
    }

    // Create a nonce for uniqueness
    const nonce = Date.now().toString();

    // Get the cluster URL
    const clusterUrl = getClusterUrl(paymentDetails.networkId);

    // Create the RPC client
    // We need to use the full Solana RPC type to avoid type errors
    let fullRpc: MinimalRpc;

    if (client.rpc) {
      // If client provides an RPC, use it directly
      // Use type assertion to tell TypeScript that the client.rpc has the minimal required methods
      fullRpc = client.rpc as MinimalRpc;
    } else {
      // Create a default RPC with the cluster URL
      fullRpc = createSolanaRpc(clusterUrl) as MinimalRpc;
    }

    // Build the transaction
    const txMessage = await buildPaymentTransaction(
      paymentDetails,
      client.publicKey,
      fullRpc,
      nonce
    );

    // Send the transaction and create the payload
    const payload = await sendAndCreatePayload(
      txMessage,
      fullRpc,
      client,
      paymentDetails.resource,
      paymentDetails.networkId
    );

    // Encode the payload as base64
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  } catch (error) {
    console.error("Error creating payment:", error);
    throw new Error(
      `Failed to create payment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { createPayment };
