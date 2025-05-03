"use client";

import { useState, useContext } from "react";
import { SelectedWalletAccountProvider, SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";
import { useSolanaTransactionProcessor } from "../hooks/useSolanaTransactionProcessor";
import { SolanaPaymentUI } from "./SolanaPaymentUI";
import { UiWallet, useWallets } from "@wallet-standard/react";

interface SolanaPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

// Main component that integrates all the pieces
const SolanaPaymentContent: React.FC<SolanaPaymentProps> = ({
  isPromptValid,
  prompt,
  isProcessing,
  setIsProcessing,
}) => {
  // State for transaction status
  const [paymentStatus, setPaymentStatus] = useState("not_paid");
  const [txHash, setTxHash] = useState("");

  // Get selected wallet account from context
  const [selectedAccount] = useContext(SelectedWalletAccountContext);
  
  // Get all available wallets
  const wallets = useWallets();
  
  // Find the wallet that owns the selected account
  const selectedWallet = selectedAccount
    ? wallets.find(wallet => 
        wallet.accounts.some(account => account.address === selectedAccount.address)
      ) as UiWallet
    : null;

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
    },
    onTransactionSubmitted: (hash) => {
      setTxHash(hash);
      // We'll consider the transaction as confirmed once we have the hash
      // The user can check the status on Solana Explorer
      setTimeout(() => {
        setPaymentStatus("confirmed");
        setIsProcessing(false);
      }, 2000); // Short delay to show processing state
    },
    onTransactionError: (errorMessage) => {
      console.error("Payment error:", errorMessage);
      setPaymentStatus("failed");
      setIsProcessing(false);
    },
  });

  // Handle payment submission
  const handlePayment = async () => {
    if (!isPromptValid() || isProcessing || !selectedAccount) {
      return;
    }

    await createAndSubmitPayment();
  };

  return (
    <SolanaPaymentUI
      isProcessing={isProcessing}
      isPromptValid={isPromptValid}
      onSubmitPayment={handlePayment}
      paymentStatus={paymentStatus}
      txHash={txHash}
    />
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
