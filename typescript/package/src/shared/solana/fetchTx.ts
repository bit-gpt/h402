import {
  createSolanaRpc,
  GetTransactionApi,
  signature as solanaKitSignature,
  TransactionVersion,
} from "@solana/kit";
import { getClusterUrl } from "./clusterEndpoints";

/**
 * Options for fetching a transaction
 */
export type FetchTxOptions = {
  /** Whether to wait for the transaction to reach desired confirmations */
  waitForConfirmation?: boolean;
  /** Maximum time to wait for confirmation in milliseconds */
  timeout?: number;
};

/**
 * Default options for fetching transactions
 */
const DEFAULT_OPTIONS: FetchTxOptions = {
  waitForConfirmation: true,
  timeout: 30000, // 30 seconds
};

/**
 * Fetch a transaction by its signature
 * Optionally wait for it to reach the desired confirmation level
 */
export async function fetchTransaction(
  signature: string,
  clusterId: string,
  options: FetchTxOptions = {}
): Promise<ReturnType<GetTransactionApi["getTransaction"]>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rpc = createSolanaRpc(getClusterUrl(clusterId));

  console.log(
    `[DEBUG-SOLANA-FETCH] Fetching transaction with signature: ${signature}`
  );
  console.log(
    `[DEBUG-SOLANA-FETCH] Using cluster: ${getClusterUrl(clusterId)}`
  );

  const transactionOptions = {
    maxSupportedTransactionVersion: 0 as TransactionVersion,
    encoding: "json" as const,
    commitment: "finalized" as const, // This ensures we get the highest confirmation level
  };

  // If we don't need to wait, just fetch the transaction once
  if (!opts.waitForConfirmation) {
    try {
      return await rpc
        .getTransaction(solanaKitSignature(signature), transactionOptions)
        .send();
    } catch (error) {
      console.error(`[ERROR-SOLANA-FETCH] Single fetch error:`, error);
      throw error;
    }
  }

  // For polling, use a single approach with max attempts and timeout
  const startTime = Date.now();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (Date.now() - startTime < opts.timeout! && attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const response = await rpc
        .getTransaction(solanaKitSignature(signature), transactionOptions)
        .send();

      // If transaction found, return it regardless of status
      if (response) {
        console.log(`[DEBUG-SOLANA-FETCH] Transaction found, returning result`);
        return response;
      }
    } catch (error) {
      console.error(
        `[ERROR-SOLANA-FETCH] Polling error (attempt ${attempts}/${MAX_ATTEMPTS}):`,
        error
      );
    }

    // Only wait if we're going to make another attempt
    if (attempts < MAX_ATTEMPTS && Date.now() - startTime < opts.timeout!) {
      console.log(`[DEBUG-SOLANA-FETCH] Waiting 5 seconds before next poll`);
      // Public RPC rate limit is agressive, so we need to be patient
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }

  // If we timed out or reached max attempts, try one last fetch
  console.log(
    `[DEBUG-SOLANA-FETCH] Polling limit reached, making final attempt`
  );
  try {
    return await rpc
      .getTransaction(solanaKitSignature(signature), transactionOptions)
      .send();
  } catch (error) {
    console.error(`[ERROR-SOLANA-FETCH] Final fetch error:`, error);
    throw error;
  }
}
