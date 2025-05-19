// types/wallet.ts

/**
 * Wallet option for UI display
 */
export interface WalletOption {
  id: string;
  name: string;
  icon: string;
}

/**
 * Wallet connection status
 */
export type WalletConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Wallet connection error
 */
export interface WalletConnectionError {
  code: string;
  message: string;
  originalError?: unknown;
}

/**
 * Common wallet account interface
 * Abstracts over different wallet types
 */
export interface WalletAccount {
  address: string;
  publicKey?: string;
  displayName?: string;
  network: string;
  balance?: string;
}

/**
 * Wallet client interface
 * Common interface for EVM and Solana wallet clients
 */
export interface WalletClient {
  isConnected: boolean;
  accounts: WalletAccount[];
  connect: (walletId: string) => Promise<WalletAccount[]>;
  disconnect: () => Promise<void>;
  getBalance: (address: string) => Promise<string>;
  signTransaction: (...args: any[]) => Promise<any>;
  sendTransaction: (...args: any[]) => Promise<string>;
}
