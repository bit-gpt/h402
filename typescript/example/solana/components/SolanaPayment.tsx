"use client";

import { useState, useContext, useEffect, useCallback } from "react";
import { SelectedWalletAccountProvider, SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";
import { useSolanaTransactionProcessor } from "../hooks/useSolanaTransactionProcessor";
import { WalletPanel } from "@/components/WalletPanel";
import TransactionStatus from "@/components/TransactionStatus";
import { UiWallet, useWallets } from "@wallet-standard/react";
import { SOLANA_WALLET_OPTIONS } from "@/config/walletOptions";

interface SolanaPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onWalletConnectionChange?: (isConnected: boolean) => void;
}

// Main component that integrates all the pieces
const SolanaPaymentContent: React.FC<SolanaPaymentProps> = ({
  isPromptValid,
  prompt,
  isProcessing,
  setIsProcessing,
  onWalletConnectionChange,
}) => {
  // State for transaction status
  const [paymentStatus, setPaymentStatus] = useState("not_paid");
  const [txHash, setTxHash] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Get selected wallet account from context
  const [selectedAccount, setSelectedAccount] = useContext(SelectedWalletAccountContext);
  
  // Get all available wallets
  const wallets = useWallets();
  
  // Find the wallet that owns the selected account
  const selectedWallet = selectedAccount
    ? wallets.find(wallet => 
        wallet.accounts.some(account => account.address === selectedAccount.address)
      ) as UiWallet
    : null;

  // Notify parent component about wallet connection status changes
  useEffect(() => {
    if (onWalletConnectionChange) {
      onWalletConnectionChange(!!selectedAccount);
    }
  }, [selectedAccount, onWalletConnectionChange]);

  // Transaction processor
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
      setStatusMessage("Processing payment...");
    },
    onTransactionSubmitted: (hash) => {
      setTxHash(hash);
      setStatusMessage("Transaction submitted!");
      // We'll consider the transaction as confirmed once we have the hash
      // The user can check the status on Solana Explorer
      setTimeout(() => {
        setPaymentStatus("confirmed");
        setIsProcessing(false);
      }, 2000); // Short delay to show processing state
    },
    onTransactionError: (errorMessage) => {
      console.error("Payment error:", errorMessage);
      setStatusMessage(`Error: ${errorMessage}`);
      setPaymentStatus("failed");
      setIsProcessing(false);
    },
  });

  // Wallet connection handlers
  const handleConnect = useCallback(async (): Promise<void> => {
    console.log("SolanaPayment - Showing wallet options");
    setShowWalletOptions(true);
    // This function doesn't actually connect directly, it just shows options
    // The actual connection happens in handleWalletSelection
    return Promise.resolve();
  }, []);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    try {
      console.log("SolanaPayment - Disconnecting wallet");
      setSelectedAccount(undefined);
      setShowWalletOptions(false);
      setStatusMessage("");
      return Promise.resolve();
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage("Failed to disconnect wallet");
      return Promise.reject(error);
    }
  }, [setSelectedAccount]);

  // Handle wallet option selection
  const handleWalletSelection = useCallback(async (walletId: string): Promise<void> => {
    console.log("SolanaPayment - Selected wallet option:", walletId);
    try {
      setShowWalletOptions(false);
      
      // Find the wallet by name
      const wallet = wallets.find(w => w.name.toLowerCase().includes(walletId.toLowerCase()));
      if (!wallet) {
        setStatusMessage(`Wallet ${walletId} not found`);
        return Promise.reject(new Error(`Wallet ${walletId} not found`));
      }
      
      // Connect to the wallet
      // Note: We'll use the context's setter directly instead of useConnect hook
      // since React hooks can't be used inside callbacks
      const accounts = wallet.accounts;
      if (accounts && accounts.length > 0) {
        setSelectedAccount(accounts[0]);
        setStatusMessage("");
        return Promise.resolve();
      } else {
        const error = new Error(`No accounts available in ${wallet.name}`);
        setStatusMessage(error.message);
        return Promise.reject(error);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      const errorMessage = `Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setStatusMessage(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
  }, [wallets, setSelectedAccount]);

  // Handle payment submission
  const handlePayment = useCallback(async (): Promise<void> => {
    if (!isPromptValid() || isProcessing || !selectedAccount) {
      return Promise.resolve();
    }

    await createAndSubmitPayment();
    return Promise.resolve();
  }, [createAndSubmitPayment, isPromptValid, isProcessing, selectedAccount]);

  // Check if payment can be processed
  const canSubmitPayment = useCallback(() => {
    return !!selectedAccount && isPromptValid() && !isProcessing;
  }, [selectedAccount, isPromptValid, isProcessing]);

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet Panel */}
      <WalletPanel
        connected={!!selectedAccount}
        connectedAddress={selectedAccount?.address || ""}
        statusMessage={statusMessage}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        options={showWalletOptions ? SOLANA_WALLET_OPTIONS : []}
        onSelectOption={handleWalletSelection}
        bgClass="bg-purple-600 hover:bg-purple-700"
        heading={selectedAccount ? "Wallet Connected" : "Connect your Solana wallet"}
        subheading={selectedAccount ? "Ready to pay with Solana" : "Select a wallet to pay with Solana"}
        disabled={isProcessing}
      />

      {/* Payment Button */}
      {selectedAccount && (
        <div className="mt-4">
          <button
            onClick={handlePayment}
            disabled={!canSubmitPayment()}
            className={`w-full px-4 py-2.5 ${
              !canSubmitPayment()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            } text-white rounded-lg transition-colors duration-200 font-medium`}
          >
            {isProcessing ? "Processing..." : "Pay with Solana"}
          </button>
        </div>
      )}

      {/* Transaction Status */}
      {txHash && <TransactionStatus txHash={txHash} status={paymentStatus} />}
    </div>
  );
};

// Wrapper component that provides the wallet context
const SolanaPayment: React.FC<SolanaPaymentProps> = (props) => {
  return (
    <SelectedWalletAccountProvider>
      <SolanaPaymentContent {...props} />
    </SelectedWalletAccountProvider>
  );
};

export default SolanaPayment;
