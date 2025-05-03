"use client";

import { useState, useContext, useEffect, useCallback, useMemo } from "react";
import { SelectedWalletAccountProvider, SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";
import { useSolanaTransactionProcessor } from "../hooks/useSolanaTransactionProcessor";
import { WalletPanel } from "@/components/WalletPanel";
import TransactionStatus from "@/components/TransactionStatus";
import { UiWallet, UiWalletAccount, useConnect, useWallets } from "@wallet-standard/react";
import { WalletOption } from "@/config/walletOptions";

interface SolanaPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
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

// Main component that integrates all the pieces
function SolanaPaymentContent({
  isPromptValid,
  prompt,
  isProcessing,
  setIsProcessing,
  onWalletConnectionChange,
}: SolanaPaymentProps) {
  // Get the selected wallet account from context
  const [selectedAccount, setSelectedAccount] = useContext(
    SelectedWalletAccountContext
  );

  // State for wallet connection UI
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [txHash, setTxHash] = useState("");
  const [selectedWalletForConnection, setSelectedWalletForConnection] = useState<UiWallet | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Get all available wallets
  const wallets = useWallets();
  
  // Find the wallet that owns the selected account
  const selectedWallet = selectedAccount
    ? wallets.find(wallet => 
        wallet.accounts.some(account => account.address === selectedAccount.address)
      ) as UiWallet | null
    : null;

  // Notify parent component about wallet connection status changes
  useEffect(() => {
    if (onWalletConnectionChange) {
      onWalletConnectionChange(!!selectedAccount);
    }
  }, [selectedAccount, onWalletConnectionChange]);

  // Initialize the transaction processor
  const { createAndSubmitPayment } = useSolanaTransactionProcessor({
    prompt,
    connectedAccount: selectedAccount ? {
      address: selectedAccount.address,
      publicKey: selectedAccount.publicKey as unknown as Uint8Array
    } : null,
    selectedWallet,
    onTransactionStart: () => {
      setIsProcessing(true);
      setPaymentStatus("processing");
    },
    onTransactionSubmitted: (hash) => {
      setTxHash(hash);
      setPaymentStatus("paid"); // Using "paid" to match TransactionStatus component
      setIsProcessing(false);
    },
    onTransactionError: (error) => {
      setStatusMessage(`Error: ${error}`);
      setPaymentStatus("failed");
      setIsProcessing(false);
    },
  });

  // Handle wallet error
  const handleWalletError = useCallback((error: Error) => {
    console.error("Wallet error:", error);
    setStatusMessage(error.message);
    setSelectedWalletForConnection(null);
  }, []);

  // Handle successful wallet connection
  const handleWalletConnect = useCallback((accounts: readonly UiWalletAccount[]) => {
    if (accounts && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
      setStatusMessage("");
    }
    setSelectedWalletForConnection(null);
  }, [setSelectedAccount]);

  // Handle wallet connect button click
  const handleConnect = useCallback(() => {
    setShowWalletOptions(true);
  }, []);

  // Handle wallet disconnect
  const handleDisconnect = useCallback(async (): Promise<void> => {
    try {
      setSelectedAccount(undefined);
      setStatusMessage("");
      return Promise.resolve();
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage("Failed to disconnect wallet");
      return Promise.reject(error);
    }
  }, [setSelectedAccount]);

  // Convert wallet standard wallets to the format expected by WalletPanel
  const walletOptions: WalletOption<string>[] = useMemo(() => {
    return wallets.map(wallet => ({
      id: wallet.name,
      label: wallet.name,
      // Convert data URI to StaticImageData format or use a placeholder
      icon: wallet.icon ? { src: wallet.icon, height: 24, width: 24 } : { src: "/placeholder-wallet-icon.png", height: 24, width: 24 }
    }));
  }, [wallets]);

  // Handle wallet selection
  const handleSelectWallet = useCallback(async (walletId: string): Promise<void> => {
    try {
      // Find the selected wallet
      const wallet = wallets.find(w => w.name === walletId);
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
  }, [wallets, handleWalletError]);

  // Handle payment submission
  const handlePayment = useCallback(async (): Promise<void> => {
    if (!isPromptValid() || isProcessing || !selectedAccount) {
      return Promise.resolve();
    }

    await createAndSubmitPayment();
    return Promise.resolve();
  }, [createAndSubmitPayment, isPromptValid, isProcessing, selectedAccount]);

  // Check if payment can be processed
  const canProcessPayment = selectedAccount && isPromptValid() && !isProcessing;

  return (
    <div className="space-y-4">
      {/* Wallet Connector - Only rendered when a wallet is selected for connection */}
      {selectedWalletForConnection && (
        <WalletConnector
          wallet={selectedWalletForConnection}
          onConnect={handleWalletConnect}
          onError={handleWalletError}
        />
      )}

      {/* Wallet Connection Panel */}
      <WalletPanel
        connected={!!selectedAccount}
        connectedAddress={selectedAccount?.address || ""}
        statusMessage={statusMessage}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        options={showWalletOptions ? walletOptions : []}
        onSelectOption={handleSelectWallet}
        bgClass="bg-purple-600 hover:bg-purple-700"
        heading="Connect Solana Wallet"
        subheading="Connect your Solana wallet to pay for image generation"
        disabled={isProcessing || !!selectedWalletForConnection}
      />

      {/* Payment Button */}
      {selectedAccount && (
        <button
          onClick={handlePayment}
          disabled={!canProcessPayment}
          className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
            canProcessPayment
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isProcessing ? "Processing..." : "Pay with SOL"}
        </button>
      )}

      {/* Transaction Status */}
      {paymentStatus !== "idle" && (
        <TransactionStatus
          txHash={txHash}
          status={paymentStatus}
        />
      )}
    </div>
  );
}

// Wrapper component that provides the wallet context
const SolanaPayment: React.FC<SolanaPaymentProps> = (props) => {
  return (
    <SelectedWalletAccountProvider>
      <SolanaPaymentContent {...props} />
    </SelectedWalletAccountProvider>
  );
};

export default SolanaPayment;
