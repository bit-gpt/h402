import { createSolanaRpc } from "@solana/kit";
import { PublicActions, WalletClient } from "viem";
import { PaymentDetails } from "./protocol.js";
import {
  TransactionModifyingSigner,
  TransactionSendingSigner,
} from "@solana/signers";

/**
 * Interface for Solana client used in payment operations
 */
export interface SolanaClient {
  publicKey: string;
  signAndSendTransaction?: TransactionSendingSigner["signAndSendTransactions"];
  signTransaction?: TransactionModifyingSigner["modifyAndSignTransactions"];
  rpc?: Partial<ReturnType<typeof createSolanaRpc>>;
}

/**
 * Interface for EVM client used in payment operations
 */
export interface EvmClient extends WalletClient, PublicActions {}

/**
 * Interface for the payment client that can handle different blockchains
 */
export interface PaymentClient {
  evmClient?: EvmClient;
  solanaClient?: SolanaClient;
}

/**
 * Interface for the createPayment function signature
 */
export interface CreatePaymentFunction {
  (paymentDetails: PaymentDetails, client: PaymentClient): Promise<string>;
}
