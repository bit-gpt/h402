"use client";

import { useState } from "react";
import {
  SolanaWalletProvider,
  useSolanaWallet,
} from "@/solana/context/SolanaWalletContext";
import { useSolanaTransactionProcessor } from "../hooks/useSolanaTransactionProcessor";
import { SolanaPaymentUI } from "./SolanaPaymentUI";

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

  // Get wallet context - only use what we need
  const [{ account: connectedAccount, wallet: selectedWallet }] =
    useSolanaWallet();

  // Transaction processor
  const { createAndSubmitPayment } = useSolanaTransactionProcessor({
    prompt,
    connectedAccount,
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
    if (!isPromptValid() || isProcessing || !connectedAccount) {
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
    <SolanaWalletProvider>
      <SolanaPaymentContent {...props} />
    </SolanaWalletProvider>
  );
};

export default SolanaPayment;
