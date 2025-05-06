"use client";

import {
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
} from "react";
import { SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";
import { DisconnectedWalletPanel } from "@/components/DisconnectedWalletPanel";
import { SolanaConnectedWalletPanel } from "@/solana/components/SolanaConnectedWalletPanel";
import {
  UiWallet,
  UiWalletAccount,
  useConnect,
  useWallets,
} from "@wallet-standard/react";
import { WalletOption } from "@/config/walletOptions";

// Common interface for components that need wallet connection state callback
export interface WalletConnectionProps {
  onWalletConnectionChange?: (isConnected: boolean) => void;
}

// Component to handle wallet connection
function WalletConnector({
  wallet,
  onConnect,
  onError,
}: {
  wallet: UiWallet;
  onConnect: (accounts: readonly UiWalletAccount[]) => void;
  onError: (error: Error) => void;
}) {
  const [, connect] = useConnect(wallet);

  // Effect to connect when the component mounts
  useEffect(() => {
    const connectWallet = async () => {
      try {
        const accounts = await connect();
        if (accounts && accounts.length > 0) {
          onConnect(accounts);
        } else {
          onError(new Error(`No accounts available in ${wallet.name}`));
        }
      } catch (error) {
        onError(error as Error);
      }
    };

    connectWallet();
  }, [connect, onConnect, onError, wallet.name]);

  return null; // This component doesn't render anything
}

// Wallet Connection Component - handles all wallet connection logic
const SolanaWalletConnector = forwardRef<HTMLDivElement, WalletConnectionProps>(
  ({ onWalletConnectionChange }, ref) => {
    // Get the selected wallet account from context
    const [selectedAccount, setSelectedAccount] = useContext(
      SelectedWalletAccountContext
    );

    // State for wallet connection UI
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedWalletForConnection, setSelectedWalletForConnection] =
      useState<UiWallet | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
    const [showWalletOptions, setShowWalletOptions] = useState(false);

    // Get all available wallets
    const wallets = useWallets();

    // Notify parent component about wallet connection status changes
    useEffect(() => {
      if (onWalletConnectionChange) {
        onWalletConnectionChange(!!selectedAccount);
      }
    }, [selectedAccount, onWalletConnectionChange]);

    // Handle wallet error
    const handleWalletError = useCallback((error: Error) => {
      console.error("Wallet error:", error);
      setStatusMessage(error.message);
      setSelectedWalletForConnection(null);
    }, []);

    // Handle successful wallet connection
    const handleWalletConnect = useCallback(
      (accounts: readonly UiWalletAccount[]) => {
        if (accounts && accounts.length > 0) {
          setSelectedAccount(accounts[0]);
          setStatusMessage("");
          setSelectedWallet(selectedWalletForConnection);
        }
        setSelectedWalletForConnection(null);
      },
      [setSelectedAccount, selectedWalletForConnection]
    );

    // Handle wallet connect button click
    const handleConnect = useCallback(() => {
      setShowWalletOptions(true);
    }, []);

    // Handle wallet disconnect
    const handleDisconnect = useCallback(async (): Promise<void> => {
      try {
        setSelectedAccount(undefined);
        setSelectedWallet(null);
        setStatusMessage("");
        setSelectedWalletForConnection(null);
        onWalletConnectionChange?.(false);
        return Promise.resolve();
      } catch (error) {
        console.error("Disconnect error:", error);
        setStatusMessage("Failed to disconnect wallet");
        return Promise.reject(error);
      }
    }, [onWalletConnectionChange, setSelectedAccount]);

    // Convert wallet standard wallets to the format expected by WalletPanel
    const walletOptions: WalletOption<string>[] = useMemo(() => {
      if (wallets.length === 0) {
        console.log("No wallets found!");
        return [];
      }
      // Filter wallets to only include those that support Solana chains
      const solanaWallets = wallets.filter((wallet) =>
        wallet.chains.some((chain) => chain.startsWith("solana:"))
      );

      return solanaWallets.map((wallet) => ({
        id: wallet.name,
        label: wallet.name,
        // Convert data URI to StaticImageData format or use a placeholder
        icon: wallet.icon
          ? { src: wallet.icon, height: 24, width: 24 }
          : { src: "/placeholder-wallet-icon.png", height: 24, width: 24 },
      }));
    }, [wallets]);

    // Handle wallet selection
    const handleSelectWallet = useCallback(
      async (walletId: string): Promise<void> => {
        try {
          // Find the selected wallet
          const wallet = wallets.find((w) => w.name === walletId);
          if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
          }

          // Store the selected wallet and hide options
          setSelectedWalletForConnection(wallet);
          setShowWalletOptions(false);

          return Promise.resolve();
        } catch (error) {
          handleWalletError(error as Error);
          return Promise.reject(error);
        }
      },
      [wallets, handleWalletError]
    );

    return (
      <div className="space-y-4" ref={ref}>
        {/* Wallet Connector - Only rendered when a wallet is selected for connection */}
        {selectedWalletForConnection && (
          <WalletConnector
            wallet={selectedWalletForConnection}
            onConnect={handleWalletConnect}
            onError={handleWalletError}
          />
        )}

        {/* Wallet Connection Panel */}
        {selectedAccount && selectedWallet ? (
          <SolanaConnectedWalletPanel
            connectedAddress={selectedAccount.address}
            statusMessage={statusMessage}
            wallet={selectedWallet}
            onDisconnected={handleDisconnect}
            disabled={!!selectedWalletForConnection}
          />
        ) : (
          <DisconnectedWalletPanel
            statusMessage={statusMessage}
            onConnect={handleConnect}
            options={showWalletOptions ? walletOptions : []}
            onSelectOption={handleSelectWallet}
            bgClass="bg-purple-600 hover:bg-purple-700"
            heading="Connect Solana Wallet"
            subheading="Connect your Solana wallet to pay for image generation"
            disabled={!!selectedWalletForConnection}
          />
        )}
      </div>
    );
  }
);

SolanaWalletConnector.displayName = "SolanaWalletConnector";

export default SolanaWalletConnector;
