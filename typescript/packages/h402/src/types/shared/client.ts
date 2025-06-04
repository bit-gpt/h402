import type { PublicActions, WalletClient } from "viem";
import type {
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
