import { useState } from "react";
import {
  WalletClient,
  PublicActions,
  publicActions,
} from "viem";
import { bsc } from "viem/chains";
import { connect, disconnect } from "wagmi/actions";
import {
  injected,
  metaMask,
  coinbaseWallet,
  walletConnect,
} from "wagmi/connectors";
import { getWalletClient } from "@wagmi/core";
import { config } from "../config/wagmi";
import { useConnectionState } from "./useConnectionState";

export type WalletType = "metamask" | "coinbase" | "rabby" | "trust" | "walletconnect";

interface UseWalletReturn {
  walletClient: (WalletClient & PublicActions) | null;
  connectedAddress: string;
  statusMessage: string;
  setStatusMessage: React.Dispatch<React.SetStateAction<string>>;
  connectWallet: (walletType: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

export function useEvmWallet(): UseWalletReturn {
  const [walletClient, setWalletClient] = useState<
    (WalletClient & PublicActions) | null
  >(null);
  const {
    connectedAddress,
    setConnectedAddress,
    statusMessage,
    setStatusMessage,
  } = useConnectionState();

  const connectWallet = async (walletType: WalletType) => {
    try {
      setStatusMessage("Connecting wallet...");

      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error(
          "No Ethereum wallet detected. Please install MetaMask or another wallet extension."
        );
      }

      // Pick connector
      let connector;
      if (walletType === "metamask") {
        connector = metaMask();
      } else if (walletType === "coinbase") {
        connector = coinbaseWallet();
      } else if (walletType === "rabby") {
        connector = injected({ shimDisconnect: true, target: "rabby" });
      } else if (walletType === "trust" || walletType === "walletconnect") {
        connector = walletConnect({
          projectId: "233c440b08a2b78d6b3e76370b979bed",
        });
      } else {
        connector = injected({ shimDisconnect: true });
      }

      const result = await connect(config, { connector, chainId: bsc.id });

      if (!result.accounts?.[0]) {
        throw new Error("Please select an account in your wallet");
      }

      const baseClient = await getWalletClient(config, {
        account: result.accounts[0],
        chainId: bsc.id,
      });

      // Extend with read-only public actions.
      // TS structurally mismatches the two `call` overloads, so we cast via `unknown`.
      const client = baseClient.extend(publicActions) as unknown as WalletClient & PublicActions;

      const [address] = await client.getAddresses();
      if (!address) {
        throw new Error("Cannot access wallet account");
      }

      const chainId = await client.getChainId();
      if (chainId !== bsc.id) {
        throw new Error("Please switch to BSC network");
      }

      setWalletClient(client);
      setConnectedAddress(address);
      setStatusMessage("Wallet connected!");
    } catch (error) {
      console.error("Connection error:", error);
      let message = "Failed to connect wallet";

      if (error instanceof Error) {
        if (error.message.includes("Unsupported chain")) {
          message = "This wallet doesn't support BSC. Please use MetaMask or another BSC-compatible wallet.";
        } else if (error.message.includes("User rejected")) {
          message = "Connection rejected. Please try again.";
        } else if (error.message.includes("already pending")) {
          message = "Connection already pending. Check your wallet.";
        } else if (error.message.includes("No Ethereum provider")) {
          message = "No Ethereum provider found. Please install a wallet extension.";
        }
      }
      setStatusMessage(message);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect(config);
    } finally {
      setWalletClient(null);
      setConnectedAddress("");
      setStatusMessage("");
    }
  };

  return {
    walletClient,
    connectedAddress,
    statusMessage,
    setStatusMessage,
    connectWallet,
    disconnectWallet,
  };
}
