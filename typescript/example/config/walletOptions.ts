import { StaticImageData } from "next/image";
import metamaskIcon from "../assets/wallets/metamask.svg";
import rabbyIcon from "../assets/wallets/rabby.svg";
import trustIcon from "../assets/wallets/trustwallet.svg";
import walletConnectIcon from "../assets/wallets/walletConnect.svg";
import coinbaseIcon from "../assets/wallets/coinbase.svg";
import { WalletType } from "../evm/context/EvmWalletContext";

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
