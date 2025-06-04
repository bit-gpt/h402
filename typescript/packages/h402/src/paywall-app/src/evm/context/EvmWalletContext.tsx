import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type WalletClient, type PublicActions, publicActions } from "viem";
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

// Export the WalletType for use in other components
export type WalletType =
  | "metamask"
  | "coinbase"
  | "rabby"
  | "trust"
  | "walletconnect";

interface EvmWalletContextType {
  walletClient: (WalletClient & PublicActions) | null;
  connectedAddress: string;
  statusMessage: string;
  setStatusMessage: (message: string) => void;
  connectWallet: (walletType: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

// Create context with default values
const EvmWalletContext = createContext<EvmWalletContextType>({
  walletClient: null,
  connectedAddress: "",
  statusMessage: "",
  setStatusMessage: () => {},
  connectWallet: async () => {},
  disconnectWallet: async () => {},
});

// Hook to use the EVM wallet context
export const useEvmWallet = () => useContext(EvmWalletContext);

// Provider component for the EVM wallet context
export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const [walletClient, setWalletClient] = useState<
    (WalletClient & PublicActions) | null
  >(null);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const connectWallet = useCallback(async (walletType: WalletType) => {
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

      // First connect without specifying chainId to check current chain
      const initialResult = await connect(config, { connector });

      if (!initialResult.accounts?.[0]) {
        throw new Error("Please select an account in your wallet");
      }

      // Check if we need to switch chains
      try {
        const initialClient = await getWalletClient(config, {
          account: initialResult.accounts[0],
        });

        if (initialClient) {
          const currentChainId = await initialClient.getChainId();

          // If not on BSC, we need to switch
          if (currentChainId !== bsc.id) {
            setStatusMessage("Please switch to BSC network in your wallet...");

            try {
              // Request chain switch
              await initialClient.switchChain({ id: bsc.id });
              console.log("Chain switched successfully to BSC");
            } catch (switchError) {
              console.error("Failed to switch chain:", switchError);
              throw new Error(
                "Please manually switch to Binance Smart Chain (BSC) in your wallet and try again."
              );
            }
          }
        }
      } catch (checkError) {
        console.error("Error checking/switching chain:", checkError);
      }

      // Now connect with the correct chain
      const result = await connect(config, { connector, chainId: bsc.id });

      if (!result.accounts?.[0]) {
        throw new Error("Please select an account in your wallet");
      }

      const baseClient = await getWalletClient(config, {
        account: result.accounts[0],
        chainId: bsc.id,
      });

      if (!baseClient) {
        throw new Error("Failed to get wallet client");
      }

      // Extend with read-only public actions.
      // TS structurally mismatches the two `call` overloads, so we cast via `unknown`.
      const client = baseClient.extend(
        publicActions
      ) as unknown as WalletClient & PublicActions;

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
      console.error("EvmWalletContext - Connection error:", error);
      let message = "Failed to connect wallet";

      if (error instanceof Error) {
        if (error.message.includes("Unsupported chain")) {
          message =
            "This wallet doesn't support BSC. Please use MetaMask or another BSC-compatible wallet.";
        } else if (error.message.includes("User rejected")) {
          message = "Connection rejected. Please try again.";
        } else if (error.message.includes("already pending")) {
          message = "Connection already pending. Check your wallet.";
        } else if (error.message.includes("No Ethereum provider")) {
          message =
            "No Ethereum provider found. Please install a wallet extension.";
        } else if (error.message.includes("chain of the connector") || error.message.includes("chain mismatch")) {
          message = "Please switch to Binance Smart Chain (BSC) in your wallet and try again.";
        }
      }
      setStatusMessage(message);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      // Try to disconnect using wagmi, but don't wait for it to complete
      // as it might fail if the wallet doesn't support disconnection
      disconnect(config).catch((err) => {
        console.warn("Disconnect from wagmi failed:", err);
      });

      // Always clear the local state regardless of wagmi disconnect result
      setWalletClient(null);
      setConnectedAddress("");
      setStatusMessage("Wallet disconnected");

      // For MetaMask and some other wallets, we need to manually clear localStorage
      // to ensure the wallet is fully disconnected
      if (typeof window !== "undefined") {
        // Clear any wallet-related localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("wagmi") || key.includes("wallet"))) {
            keysToRemove.push(key);
          }
        }

        // Remove the keys in a separate loop to avoid issues with changing localStorage during iteration
        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error("EvmWalletContext - Disconnect error:", error);
      // Even if there's an error, still clear the local state
      setWalletClient(null);
      setConnectedAddress("");
      setStatusMessage("Wallet disconnected (with errors)");
    }
  }, []);

  // Create the context value
  const contextValue = {
    walletClient,
    connectedAddress,
    statusMessage,
    setStatusMessage,
    connectWallet,
    disconnectWallet,
  };

  return (
    <EvmWalletContext.Provider value={contextValue}>
      {children}
    </EvmWalletContext.Provider>
  );
}
