"use client";

import { useState, useCallback, useContext, useEffect } from "react";
import PaymentSelector from "@/components/PaymentSelector";
import EvmPayment from "@/evm/components/EvmPayment";
import SolanaPayment from "@/solana/components/SolanaPayment";
import ImagePromptInput from "@/components/ImagePromptInput";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
import { SelectedWalletAccountContext } from "@/solana/context/SelectedWalletAccountContext";

const MIN_PROMPT_LENGTH = 3;

// Define payment method type
type PaymentMethod = "evm" | "solana";

export default function Paywall() {
  // Shared state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("evm");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [evmWalletConnected, setEvmWalletConnected] = useState(false);
  
  // Get wallet connection state based on selected payment method
  const { connectedAddress } = useEvmWallet();
  const [selectedAccount] = useContext(SelectedWalletAccountContext);
  
  // Update EVM wallet connection state when address changes
  useEffect(() => {
    console.log("EVM connectedAddress:", connectedAddress);
    setEvmWalletConnected(!!connectedAddress);
  }, [connectedAddress]);
  
  // Determine if wallet is connected based on payment method
  const walletConnected = paymentMethod === "evm" 
    ? evmWalletConnected 
    : !!selectedAccount;
    
  console.log("Wallet connected state:", { 
    paymentMethod, 
    evmWalletConnected, 
    connectedAddress, 
    solanaWalletConnected: !!selectedAccount,
    walletConnected
  });

  // Check if prompt is valid
  const isPromptValid = useCallback(() => {
    return imagePrompt.trim().length >= MIN_PROMPT_LENGTH;
  }, [imagePrompt]);

  // Handle prompt change
  const handlePromptChange = useCallback((value: string) => {
    setImagePrompt(value);
  }, []);

  // Method selection handler
  const handleMethodChange = useCallback(
    (method: PaymentMethod) => {
      if (!isProcessing) {
        setPaymentMethod(method);
      }
    },
    [isProcessing]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-full">
      <div className="w-full max-w-[800px] mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          402 pay Image Generation Example
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
          Connect your wallet, enter a prompt, and pay a small fee to generate
          an AI image using the HTTP 402 payment protocol.
        </p>

        {/* Payment Method Selection */}
        <PaymentSelector
          paymentMethod={paymentMethod}
          onMethodChange={handleMethodChange}
          disabled={isProcessing}
        />

        {/* Payment Component */}
        {paymentMethod === "evm" ? (
          <EvmPayment
            isPromptValid={isPromptValid}
            prompt={imagePrompt}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        ) : (
          <SolanaPayment
            isPromptValid={isPromptValid}
            prompt={imagePrompt}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}

        {/* Prompt Input - Only display when a wallet is connected */}
        <ImagePromptInput
          value={imagePrompt}
          onChange={handlePromptChange}
          disabled={isProcessing}
          minLength={MIN_PROMPT_LENGTH}
          paymentMethod={paymentMethod}
          walletConnected={walletConnected}
        />
      </div>
    </div>
  );
}
