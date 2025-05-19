// Solana-specific types for the `exact` payment scheme
// ----------------------------------------------------
// Client → Facilitator payload for Solana transactions using Wallet Standard

import { PaymentPayload } from "../../../index.js";

// ----------------------------
// Solana `exact` scheme types
// ----------------------------

/** 
 * Common parameters for all Solana transactions 
 */
type BaseTransactionParameters = {
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
type NativeTransferParameters = BaseTransactionParameters & {
  /** Optional memo to include with the transaction */
  memo?: string;
};

/** 
 * Parameters for SPL token transfers 
 */
type TokenTransferParameters = BaseTransactionParameters & {
  /** The mint address of the token */
  mint: string;
  /** Optional memo to include with the transaction */
  memo?: string;
};

/** 
 * Parameters for SignAndSendTransaction method 
 */
type SignAndSendTransactionParameters = {
  /** The transaction signature returned by the wallet's signAndSendTransaction method */
  signature: string;
  /** Optional memo included with the transaction */
  memo?: string;
};

/** 
 * Parameters for SignTransaction method 
 */
type SignTransactionParameters = {
  /** The base64 encoded signed transaction */
  signedTransaction: string;
  /** Optional memo included with the transaction */
  memo?: string;
};

/** 
 * Parameters for SignMessage method 
 */
type SignMessageParameters = {
  /** The message that was signed */
  message: string;
  /** The signature produced by signing the message */
  signature: string;
};

/** 
 * Payload for native SOL transfers 
 */
type NativeTransferPayload = {
  type: "nativeTransfer";
  signature: string;
  transaction: NativeTransferParameters;
};

/** 
 * Payload for SPL token transfers 
 */
type TokenTransferPayload = {
  type: "tokenTransfer";
  signature: string;
  transaction: TokenTransferParameters;
};

/** 
 * Payload for SignAndSendTransaction method 
 */
type SignAndSendTransactionPayload = {
  type: "signAndSendTransaction";
  signature: string;
  transaction: SignAndSendTransactionParameters;
};

/** 
 * Payload for SignTransaction method 
 */
type SignTransactionPayload = {
  type: "signTransaction";
  signedTransaction: string;
  transaction: SignTransactionParameters;
};

/** 
 * Payload for SignMessage method 
 */
type SignMessagePayload = {
  type: "signMessage";
  signature: string;
  message: SignMessageParameters;
};

/**
 * Union type of all possible Solana payment payloads
 */
type Payload =
  | NativeTransferPayload
  | TokenTransferPayload
  | SignAndSendTransactionPayload
  | SignTransactionPayload
  | SignMessagePayload;

/**
 * Payment payload types for different transaction methods
 */
type NativeTransferPaymentPayload = PaymentPayload<NativeTransferPayload>;
type TokenTransferPaymentPayload = PaymentPayload<TokenTransferPayload>;
type SignAndSendTransactionPaymentPayload = PaymentPayload<SignAndSendTransactionPayload>;
type SignTransactionPaymentPayload = PaymentPayload<SignTransactionPayload>;
type SignMessagePaymentPayload = PaymentPayload<SignMessagePayload>;

// Export all types
export {
  Payload,
  NativeTransferPayload,
  TokenTransferPayload,
  SignAndSendTransactionPayload,
  SignTransactionPayload,
  SignMessagePayload,
  NativeTransferPaymentPayload,
  TokenTransferPaymentPayload,
  SignAndSendTransactionPaymentPayload,
  SignTransactionPaymentPayload,
  SignMessagePaymentPayload,
  NativeTransferParameters,
  TokenTransferParameters,
  SignAndSendTransactionParameters,
  SignTransactionParameters,
  SignMessageParameters,
  BaseTransactionParameters
};

// Protocol version for Solana `exact` scheme.
export const VERSION = 1 as const;
