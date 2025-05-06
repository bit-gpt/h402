"use client";

import { useState, useCallback, useEffect, useRef, useContext } from "react";
import PaymentSelector from "@/components/PaymentSelector";
import EvmPayment from "@/evm/components/EvmPayment";
import ImagePromptInput from "@/components/ImagePromptInput";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
// Import individual components instead of the combined one
import SolanaWalletConnector from "@/solana/components/SolanaWalletConnector";
import SolanaPaymentProcessor from "@/solana/components/SolanaPaymentProcessor";
import { SelectedWalletAccountContext } from "@/solana/context/SelectedWalletAccountContext";

const MIN_PROMPT_LENGTH = 3;

// Define payment method type
type PaymentMethod = "evm" | "solana";

// Create a combined Solana payment components wrapper
function SolanaPaymentComponents({
  isPromptValid,
  isProcessing,
  setIsProcessing,
  onWalletConnectionChange,
  buttonRef,
  walletConnected,
  prompt,
}: {
  isPromptValid: () => boolean;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onWalletConnectionChange: (isConnected: boolean) => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  walletConnected: boolean;
  prompt: string;
}) {
  // Add a state to track when the wallet is fully connected with an account
  const [selectedAccount] = useContext(SelectedWalletAccountContext);
  
  // Only consider wallet connected when we have both the flag and a valid account
  const isWalletFullyConnected = walletConnected && !!selectedAccount;

  return (
    <div className="space-y-6">
      {/* Wallet connector is always shown */}
      <SolanaWalletConnector
        onWalletConnectionChange={onWalletConnectionChange}
      />

      {/* Payment processor is only shown when wallet is fully connected */}
      {isWalletFullyConnected && (
        <SolanaPaymentProcessor
          isPromptValid={isPromptValid}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          ref={buttonRef as React.RefObject<HTMLButtonElement>}
          prompt={prompt}
        />
      )}
    </div>
  );
}

export default function Paywall() {
  // Shared state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("evm");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [evmWalletConnected, setEvmWalletConnected] = useState(false);
  const [solanaWalletConnected, setSolanaWalletConnected] = useState(false);
  const [canProcessPayment, setCanProcessPayment] = useState(false);

  // Refs for payment buttons
  const evmPaymentButtonRef = useRef<HTMLButtonElement>(null);
  const solanaPaymentButtonRef = useRef<HTMLButtonElement | null>(null);

  // Get wallet connection state based on selected payment method
  const { connectedAddress } = useEvmWallet();

  // Update EVM wallet connection state when address changes
  useEffect(() => {
    setEvmWalletConnected(!!connectedAddress);
  }, [connectedAddress]);

  // Determine if wallet is connected based on payment method
  const walletConnected =
    paymentMethod === "evm" ? evmWalletConnected : solanaWalletConnected;

  // Check if prompt is valid
  const isPromptValid = useCallback(() => {
    return imagePrompt.trim().length >= MIN_PROMPT_LENGTH;
  }, [imagePrompt]);

  // Update canProcessPayment when relevant state changes
  useEffect(() => {
    setCanProcessPayment(walletConnected && isPromptValid() && !isProcessing);
  }, [walletConnected, isPromptValid, isProcessing]);

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

  // Handler for Solana wallet connection status
  const handleSolanaWalletConnectionChange = useCallback(
    (isConnected: boolean) => {
      setSolanaWalletConnected(isConnected);
    },
    []
  );

  // Handle generate image button click
  const handleGenerateImage = useCallback(async () => {
    if (!canProcessPayment) return Promise.resolve();

    // Trigger the appropriate payment handler based on payment method
    if (paymentMethod === "evm" && evmPaymentButtonRef.current) {
      evmPaymentButtonRef.current.click();
    } else if (paymentMethod === "solana" && solanaPaymentButtonRef.current) {
      solanaPaymentButtonRef.current.click();
    }

    return Promise.resolve();
  }, [canProcessPayment, paymentMethod]);

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
            ref={evmPaymentButtonRef}
          />
        ) : (
          <SolanaPaymentComponents
            isPromptValid={isPromptValid}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            onWalletConnectionChange={handleSolanaWalletConnectionChange}
            buttonRef={solanaPaymentButtonRef}
            walletConnected={solanaWalletConnected}
            prompt={imagePrompt}
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
          isProcessing={isProcessing}
          canProcessPayment={canProcessPayment}
          onGenerateImage={handleGenerateImage}
        />
      </div>
    </div>
  );
}
