// Solana-specific types for the `exact` payment scheme
// ----------------------------------------------------
// Client → Facilitator payload once the payment transaction has been
// broadcast to the Solana cluster.

import { PaymentPayload } from "../../../index.js";

// ----------------------------
// Solana `exact` scheme types
// ----------------------------

/** Parameters returned after the transaction is broadcast to the Solana cluster. */
type BroadcastParameters = {
  /** Base-58 transaction signature returned by `sendTransaction`. */
  txHash: string;
  /** Optional memo embedded via Memo Program (e.g. "<resourceId>:<nonce>"). */
  memo?: string;
};

/** Payload describing a broadcast Solana transaction. */
export type BroadcastPayload = {
  type: "broadcast";
  transaction: BroadcastParameters;
};

/**
 * Solana payment payload embedded in the `h402` header once the transaction
 * has been sent to the cluster.
 */
export type BroadcastPaymentPayload = PaymentPayload<BroadcastPayload>;

// Export canonical alias expected by other modules.
export { BroadcastPaymentPayload as ExactSolanaBroadcastPaymentPayload };

// Protocol version for Solana `exact` scheme.
export const VERSION = 1 as const;
