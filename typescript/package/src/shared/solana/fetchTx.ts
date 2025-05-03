import {
  createSolanaRpc,
  GetTransactionApi,
  signature as solanaSignature,
} from "@solana/kit";
import { getClusterUrl } from "./clusterEndpoints.js";

/**
 * Options for fetching a transaction
 */
export type FetchTxOptions = {
  /** Minimum confirmations required (defaults to 'finalized') */
  confirmations?: number;
  /** Whether to wait for the transaction to reach desired confirmations */
  waitForConfirmation?: boolean;
  /** Maximum time to wait for confirmation in milliseconds */
  timeout?: number;
};

/**
 * Default options for fetching transactions
 */
const DEFAULT_OPTIONS: FetchTxOptions = {
  confirmations: 32, // Finalized
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
  const signatureObj = solanaSignature(signature);

  // If we don't need to wait, just fetch the transaction
  if (!opts.waitForConfirmation) {
    // In @solana/kit, we need to call .send() to execute the RPC request
    const response = await rpc.getTransaction(signatureObj).send();
    return response;
  }

  // Otherwise poll until we get the desired confirmation level or timeout
  const startTime = Date.now();

  while (Date.now() - startTime < opts.timeout!) {
    const response = await rpc.getTransaction(signatureObj).send();

    // If transaction found and has enough confirmations, return it
    if (response && response.slot) {
      const confirmations = response.meta?.err
        ? 0
        : ((response as any).confirmations ?? 0);
      if (confirmations >= opts.confirmations!) {
        return response;
      }
    }

    // Wait a bit before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // If we timed out, try one last fetch
  const response = await rpc.getTransaction(signatureObj).send();
  return response;
}

/**
 * Check if a transaction has been confirmed
 */
export async function isTransactionConfirmed(
  signature: string,
  clusterId: string,
  minConfirmations: number = 1
): Promise<boolean> {
  const tx = await fetchTransaction(signature, clusterId, {
    confirmations: minConfirmations,
    waitForConfirmation: false,
  });

  if (!tx || !tx.meta) return false;

  const confirmations = tx.meta.err ? 0 : ((tx as any).confirmations ?? 0);
  return confirmations >= minConfirmations;
}
