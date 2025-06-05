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
