import { StaticImageData } from "next/image";
import metamaskIcon from "../app/image/wallets/metamask.svg";
import rabbyIcon from "../app/image/wallets/rabby.svg";
import trustIcon from "../app/image/wallets/trustwallet.svg";
import walletConnectIcon from "../app/image/wallets/walletConnect.svg";
import coinbaseIcon from "../app/image/wallets/coinbase.svg";
import phantomIcon from "../app/image/phantom.svg";
import { WalletType } from "../hooks/useEvmWallet";

// Update the type definition to include SolanaWalletId
export type GenericWalletId = WalletType | "phantom" | string;
export type SolanaWalletId = "phantom" | string;

export interface WalletOption<T extends GenericWalletId | SolanaWalletId> {
  id: T;
  label: string;
  icon: StaticImageData;
}

export const EVM_WALLET_OPTIONS: WalletOption<WalletType>[] = [
  { id: "trust", icon: trustIcon, label: "Trust Wallet" },
  { id: "walletconnect", icon: walletConnectIcon, label: "WalletConnect" },
  { id: "rabby", icon: rabbyIcon, label: "Rabby Wallet" },
  { id: "metamask", icon: metamaskIcon, label: "MetaMask" },
  { id: "coinbase", icon: coinbaseIcon, label: "Coinbase Wallet" },
];

export const SOLANA_WALLET_OPTIONS: WalletOption<SolanaWalletId>[] = [
  { id: "phantom", icon: phantomIcon, label: "Phantom" },
];
