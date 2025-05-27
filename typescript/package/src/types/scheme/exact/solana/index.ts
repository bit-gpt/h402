// Solana-specific types for the `exact` payment scheme
// ----------------------------------------------------
// Client → Facilitator payload for Solana transactions using Wallet Standard

import type { PaymentPayload } from "../../../index.js";

// ----------------------------
// Solana `exact` scheme types
// ----------------------------

/**
 * Common parameters for all Solana transactions
 */
export type BaseTransactionParameters = {
  /** The public key of the account that sent the transaction */
  from: string;
  /** The public key of the recipient account */
  to: string;
  /** The amount to transfer in the smallest unit (lamports for SOL) */
  value: bigint;
};

/**
 * Parameters for native SOL transfers
 */
export type NativeTransferParameters = BaseTransactionParameters & {
  /** Optional memo to include with the transaction */
  memo?: string;
};

/**
 * Parameters for SPL token transfers
 */
export type TokenTransferParameters = BaseTransactionParameters & {
  /** The mint address of the token */
  mint: string;
  /** Optional memo to include with the transaction */
  memo?: string;
};

/**
 * Parameters for SignAndSendTransaction method
 */
export type SignAndSendTransactionParameters = {
  /** The transaction signature returned by the wallet's signAndSendTransaction method */
  signature: string;
  /** Optional memo included with the transaction */
  memo?: string;
};

/**
 * Parameters for SignTransaction method
 */
export type SignTransactionParameters = {
  /** The base64 encoded signed transaction */
  signedTransaction: string;
  /** Optional memo included with the transaction */
  memo?: string;
};

/**
 * Parameters for SignMessage method
 */
export type SignMessageParameters = {
  /** The message that was signed */
  message: string;
  /** The signature produced by signing the message */
  signature: string;
};

/**
 * Payload for native SOL transfers
 */
export type NativeTransferPayload = {
  type: "nativeTransfer";
  signature: string;
  transaction: NativeTransferParameters;
};

/**
 * Payload for SPL token transfers
 */
export type TokenTransferPayload = {
  type: "tokenTransfer";
  signature: string;
  transaction: TokenTransferParameters;
};

/**
 * Payload for SignAndSendTransaction method
 */
export type SignAndSendTransactionPayload = {
  type: "signAndSendTransaction";
  signature: string;
  transaction: SignAndSendTransactionParameters;
};

/**
 * Payload for SignTransaction method
 */
export type SignTransactionPayload = {
  type: "signTransaction";
  signedTransaction: string;
  transaction: SignTransactionParameters;
};

/**
 * Payload for SignMessage method
 */
export type SignMessagePayload = {
  type: "signMessage";
  signature: string;
  message: SignMessageParameters;
};

/**
 * Union type of all possible Solana payment payloads
 */
export type Payload =
  | NativeTransferPayload
  | TokenTransferPayload
  | SignAndSendTransactionPayload
  | SignTransactionPayload
  | SignMessagePayload;

/**
 * Payment payload types for different transaction methods
 */
export type NativeTransferPaymentPayload = PaymentPayload<NativeTransferPayload>;
export type TokenTransferPaymentPayload = PaymentPayload<TokenTransferPayload>;
export type SignAndSendTransactionPaymentPayload = PaymentPayload<SignAndSendTransactionPayload>;
export type SignTransactionPaymentPayload = PaymentPayload<SignTransactionPayload>;
export type SignMessagePaymentPayload = PaymentPayload<SignMessagePayload>;

// Protocol version for Solana `exact` scheme.
export const VERSION = 1 as const;
