"use client";

import { useState, useCallback, forwardRef } from "react";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { createPayment } from "@bit-gpt/h402";
import { paymentDetails } from "@/config/paymentDetails";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
import { DisconnectedWalletPanel } from "@/components/DisconnectedWalletPanel";
import { EvmConnectedWalletPanel } from "@/evm/components/EvmConnectedWalletPanel";
import { EVM_WALLET_OPTIONS } from "@/config/walletOptions";
import { mapTxError } from "@/lib/mapTxError";
import TransactionStatus from "@/components/TransactionStatus";

interface EvmPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const EvmPayment = forwardRef<HTMLButtonElement, EvmPaymentProps>(
  ({ isPromptValid, prompt, isProcessing, setIsProcessing }, ref) => {
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
    const [paymentStatus, setPaymentStatus] = useState<string>("idle");
    const [txHash, setTxHash] = useState<string>("");

    // Check if payment can be processed
    const canSubmitPayment = useCallback(() => {
      return !!walletClient && isPromptValid() && !isProcessing;
    }, [walletClient, isPromptValid, isProcessing]);

    // Wallet connection handlers
    const handleConnect = useCallback(() => {
      console.log("EvmPayment - Showing wallet options");
      setShowWalletOptions(true);
    }, []);

    const handleDisconnect = useCallback(async () => {
      try {
        console.log("EvmPayment - Disconnecting wallet");
        await disconnectWallet();
        setShowWalletOptions(false);
      } catch (error) {
        console.error("Disconnect error:", error);
        setStatusMessage("Failed to disconnect wallet");
      }
    }, [disconnectWallet, setStatusMessage]);

    // Handle wallet option selection
    const handleWalletSelection = useCallback(
      async (walletType: string) => {
        console.log("EvmPayment - Selected wallet option:", walletType);
        try {
          setShowWalletOptions(false);
          await connectWallet(walletType as any);
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          setStatusMessage("Failed to connect wallet");
        }
      },
      [connectWallet, setStatusMessage]
    );

    // Handle EVM payment
    const handlePayment = useCallback(async () => {
      if (!canSubmitPayment()) {
        return;
      }

      setIsProcessing(true);
      setStatusMessage("Processing payment...");
      setPaymentStatus("awaiting_approval");

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

        setPaymentStatus("processing");

        // Create payment
        const paymentHeader = await createPayment(paymentDetails, {
          evmClient: walletClient || undefined,
        });

        // Set transaction hash if available from the payment process
        if (
          paymentHeader &&
          typeof paymentHeader === "string" &&
          paymentHeader.includes(":")
        ) {
          const hashPart = paymentHeader.split(":").pop();
          if (hashPart) {
            setTxHash(hashPart);
          }
        }

        setPaymentStatus("paid");
        console.log(
          "Payment successful! Redirecting directly to image generation..."
        );

        // Redirect directly to the image generation API endpoint
        window.location.href = `/api/generate-image?prompt=${encodeURIComponent(prompt.trim())}&402base64=${encodeURIComponent(
          paymentHeader
        )}`;
      } catch (error) {
        console.error("Payment failed:", error);
        setStatusMessage(mapTxError(error));
        setPaymentStatus("failed");
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
        <div className="mb-6">
          {walletClient ? (
            <EvmConnectedWalletPanel
              connectedAddress={connectedAddress}
              statusMessage={statusMessage}
              onDisconnect={handleDisconnect}
              disabled={isProcessing}
            />
          ) : (
            <DisconnectedWalletPanel
              statusMessage={statusMessage}
              onConnect={handleConnect}
              options={showWalletOptions ? EVM_WALLET_OPTIONS : []}
              onSelectOption={handleWalletSelection}
              bgClass="bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              heading="Please connect your wallet to continue"
              subheading="Make sure you are on the BSC network"
              disabled={isProcessing}
            />
          )}
        </div>

        {/* Hidden Payment Button */}
        <button
          ref={ref}
          onClick={handlePayment}
          disabled={!canSubmitPayment()}
          style={{ display: "none" }}
        >
          Hidden Payment Button
        </button>

        {/* Transaction Status */}
        {paymentStatus !== "idle" && (
          <TransactionStatus txHash={txHash} status={paymentStatus} />
        )}
      </>
    );
  }
);

EvmPayment.displayName = "EvmPayment";

export default EvmPayment;
