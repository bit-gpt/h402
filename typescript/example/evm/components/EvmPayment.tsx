"use client";

import { useState, useCallback } from "react";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { createPayment } from "@bit-gpt/h402";
import { paymentDetails } from "@/config/paymentDetails";
import { useEvmWallet } from "@/evm/hooks/useEvmWallet";
import { WalletPanel } from "@/components/WalletPanel";
import { EVM_WALLET_OPTIONS } from "@/config/walletOptions";
import { mapTxError } from "@/lib/mapTxError";

interface EvmPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const EvmPayment = ({
  isPromptValid,
  prompt,
  isProcessing,
  setIsProcessing,
}: EvmPaymentProps) => {
  // EVM wallet state
  const {
    walletClient,
    connectedAddress,
    statusMessage,
    setStatusMessage,
    connectWallet,
    disconnectWallet,
  } = useEvmWallet();

  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Check if payment can be processed
  const canSubmitPayment = useCallback(() => {
    return !!walletClient && isPromptValid() && !isProcessing;
  }, [walletClient, isPromptValid, isProcessing]);

  // Wallet connection handlers
  const handleConnect = useCallback(() => {
    setShowWalletOptions(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      setStatusMessage("Wallet disconnected");
      // Wallet disconnected successfully
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage("Failed to disconnect wallet");
    }
  }, [disconnectWallet, setStatusMessage]);

  // Handle EVM payment
  const handlePayment = useCallback(async () => {
    if (!canSubmitPayment()) {
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Processing payment...");

    try {
      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(),
      });

      // Validate chain
      const chainId = await walletClient?.chain?.id;
      if (chainId !== bsc.id) {
        throw new Error("Please switch to BSC network");
      }

      // Validate address
      const [address] = (await walletClient?.getAddresses()) ?? [];
      if (!address) {
        throw new Error("Cannot access wallet account");
      }

      // Check balance
      const balance = await publicClient.getBalance({ address });
      if (balance === BigInt(0)) {
        throw new Error("Insufficient balance for transaction");
      }

      // Create payment
      const paymentHeader = await createPayment(paymentDetails, {
        evmClient: walletClient || undefined,
      });

      console.log("Payment successful! Redirecting...");

      // Redirect with payment header
      window.location.href = `/?402base64=${encodeURIComponent(
        paymentHeader
      )}&prompt=${encodeURIComponent(prompt.trim())}`;
    } catch (error) {
      console.error("Payment failed:", error);
      setStatusMessage(mapTxError(error));
      setIsProcessing(false);
    }
  }, [
    canSubmitPayment,
    walletClient,
    prompt,
    setStatusMessage,
    setIsProcessing,
  ]);

  return (
    <>
      {/* EVM Wallet Section */}
      <WalletPanel
        connected={!!walletClient}
        connectedAddress={connectedAddress}
        statusMessage={statusMessage}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        options={showWalletOptions ? EVM_WALLET_OPTIONS : []}
        onSelectOption={connectWallet}
        bgClass="bg-blue-600 hover:bg-blue-700"
        heading="Please connect your wallet to continue"
        subheading="Make sure you are on the BSC network"
        disabled={isProcessing}
      />

      {/* Payment Button */}
      {walletClient && (
        <div className="mt-4">
          <button
            onClick={handlePayment}
            disabled={!canSubmitPayment()}
            className={`w-full px-4 py-2.5 ${
              !canSubmitPayment()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-lg transition-colors duration-200 font-medium`}
          >
            {isProcessing ? "Processing..." : "Generate Image"}
          </button>
        </div>
      )}
    </>
  );
};

export default EvmPayment;
