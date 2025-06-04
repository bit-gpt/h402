import { useState, useEffect } from "react";
import type { Network } from "@/types/payment";
import { type UiWallet } from "@wallet-standard/react";

export function useCompatibleWallet(
  selectedNetwork: Network,
  wallets: readonly UiWallet[],
  isTrueEvmProvider: boolean
) {
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  // Select appropriate wallet when network or wallet list changes
  useEffect(() => {
    const findCompatibleWallet = () => {
      const preferredWallets =
        selectedNetwork.id === "solana"
          ? ["phantom", "solflare"]
          : ["metamask", "coinbase", "wallet"];

      // Don't proceed with EVM if no valid provider is detected
      if (selectedNetwork.id === "bsc" && !isTrueEvmProvider) {
        console.log("No true EVM provider detected.");
        return null;
      }

      // For Solana network, only find Solana wallets
      if (selectedNetwork.id === "solana") {
        // First try to find preferred wallets, then fall back to any compatible wallet
        return (
          wallets.find(
            (wallet: any) =>
              wallet.chains.some((chain: string) =>
                chain.startsWith("solana:")
              ) &&
              preferredWallets.some((name: string) =>
                wallet.name.toLowerCase().includes(name)
              )
          ) ||
          wallets.find((wallet: any) =>
            wallet.chains.some((chain: string) => chain.startsWith("solana:"))
          )
        );
      }

      // For EVM network, only find EVM wallets
      if (selectedNetwork.id === "bsc") {
        // First try to find preferred wallets, then fall back to any compatible wallet
        return (
          wallets.find(
            (wallet: any) =>
              wallet.chains.some((chain: string) => chain.startsWith("evm:")) &&
              preferredWallets.some((name: string) =>
                wallet.name.toLowerCase().includes(name)
              )
          ) ||
          wallets.find((wallet: any) =>
            wallet.chains.some((chain: string) => chain.startsWith("evm:"))
          )
        );
      }

      return null;
    };

    setSelectedWallet(findCompatibleWallet());
  }, [selectedNetwork, wallets, isTrueEvmProvider]);

  return { selectedWallet };
}
