"use client";

import { useState, useEffect, useCallback } from "react";
import { createPayment } from "@bit-gpt/h402";
import { solanaPaymentDetails } from "@/config/paymentDetails";
import SolanaWalletPanel from "@/components/SolanaWalletPanel";
import { SOLANA_WALLET_OPTIONS } from "@/config/walletOptions";
import { mapTxError } from "@/lib/mapTxError";
import { createProxiedSolanaRpc } from "@/lib/proxiedSolanaRpc";
import { PaymentClient } from "@bit-gpt/h402/types";
import { signature as solanaSignature } from "@solana/kit";
import TransactionStatus from "./TransactionStatus";

// Add Phantom wallet type definitions
interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string; toBytes: () => Uint8Array } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction?: (transaction: any) => Promise<{ signature: string }>;
}

interface WindowWithPhantom extends Window {
  phantom?: {
    solana?: PhantomProvider;
  };
}

// Declare global window with Phantom
declare const window: WindowWithPhantom;

const POLL_INTERVAL = 2000; // 2 seconds
const TRANSACTION_TIMEOUT = 30000; // 30 seconds

interface SolanaPaymentProps {
  isPromptValid: () => boolean;
  prompt: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const SolanaPayment: React.FC<SolanaPaymentProps> = ({
  isPromptValid,
  prompt,
  isProcessing,
  setIsProcessing,
}) => {
  const [connectedAccount, setConnectedAccount] = useState<{
    address: string;
    publicKey: Uint8Array;
  } | null>(null);
  const [solanaStatusMessage, setSolanaStatusMessage] = useState("");
  const [showSolanaWalletOptions, setShowSolanaWalletOptions] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("not_paid");
  const [solanaPaymentTxHash, setSolanaPaymentTxHash] = useState("");
  const [transactionPollingActive, setTransactionPollingActive] =
    useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setTransactionPollingActive(false);
      setPaymentStatus("not_paid");
    };
  }, [timeoutId]);

  useEffect(() => {
    if (!connectedAccount) {
      setSolanaPaymentTxHash("");
      setPaymentStatus("not_paid");
    }
  }, [connectedAccount]);

  const canSubmitPayment = useCallback(() => {
    return !!connectedAccount && isPromptValid() && !isProcessing;
  }, [connectedAccount, isPromptValid, isProcessing]);

  const handleConnect = useCallback(() => {
    setShowSolanaWalletOptions(true);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      // If using direct Phantom API, disconnect
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }

      setConnectedAccount(null);
      setSolanaStatusMessage("Solana wallet disconnected");
    } catch (error) {
      console.error("Solana disconnect error:", error);
      setSolanaStatusMessage("Failed to disconnect Solana wallet");
    }
  }, []);

  const connectSolanaWallet = useCallback(async (walletId: string) => {
    try {
      setSolanaStatusMessage("Connecting to Solana wallet...");
      console.log("Connecting to wallet:", walletId);

      if (walletId === "phantom") {
        // Check if Phantom is installed
        const isPhantomInstalled = window.phantom?.solana?.isPhantom;

        if (!isPhantomInstalled) {
          setSolanaStatusMessage("Phantom wallet not installed. Please install Phantom wallet.");
          return;
        }

        try {
          // Request connection to Phantom wallet using direct API
          const response = await window.phantom?.solana?.connect();
          const publicKey = response?.publicKey;

          if (publicKey) {
            // Store just the necessary account information
            setConnectedAccount({
              address: publicKey.toString(),
              publicKey: publicKey.toBytes()
            });
            setSolanaStatusMessage("Connected to Phantom wallet");
            setShowSolanaWalletOptions(false);
          } else {
            throw new Error("Failed to connect to Phantom wallet");
          }
        } catch (error) {
          console.error("Phantom connect error:", error);
          setSolanaStatusMessage(
            `Failed to connect to Phantom: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        setSolanaStatusMessage(`Wallet ${walletId} not supported yet`);
      }
    } catch (error: unknown) {
      console.error("Solana connect error:", error);
      setSolanaStatusMessage(
        `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, []);

  const setupTransactionTimeout = useCallback(() => {
    const id = setTimeout(() => {
      setTransactionPollingActive(false);
      setPaymentStatus("failed");
      setSolanaStatusMessage("Transaction timed out. Please try again.");
      console.error("Transaction timed out. Please try again.");
      setIsProcessing(false);
    }, TRANSACTION_TIMEOUT);

    setTimeoutId(id);
    return id;
  }, [setIsProcessing]);

  const handlePayment = useCallback(async () => {
    if (!canSubmitPayment()) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");
    setSolanaStatusMessage("Processing payment...");

    try {
      const dynamicSolanaPaymentDetails = {
        ...solanaPaymentDetails,
        resource: `solana-image-${Date.now()}`,
      };

      // Create a proxied Solana RPC client for the payment process
      const proxiedRpc = createProxiedSolanaRpc();

      // Only proceed if we have a connected account
      if (!connectedAccount) {
        throw new Error("No wallet connected");
      }

      // Check if Phantom is available for signing
      if (!window.phantom?.solana) {
        throw new Error("Phantom wallet not available for signing");
      }

      // Use the signer from the Phantom wallet directly
      const paymentClient: PaymentClient = {
        solanaClient: {
          // Use the connected account address
          publicKey: connectedAccount.address,
          signAndSendTransaction: async (transaction) => {
            try {
              // Use the Phantom wallet directly to sign and send the transaction
              const result = await window.phantom?.solana?.signAndSendTransaction?.(transaction);

              if (!result || !result.signature) {
                throw new Error("Wallet did not return a transaction signature");
              }

              return result.signature;
            } catch (error) {
              console.error("Error in signAndSendTransaction:", error);
              throw error;
            }
          },
          rpc: proxiedRpc,
        },
      };

      // Create the payment
      const paymentHeader = await createPayment(
        dynamicSolanaPaymentDetails,
        paymentClient
      );

      // Store the transaction hash for display
      setSolanaPaymentTxHash("Transaction submitted");
      setSolanaStatusMessage(
        "Payment initiated! Please approve in your wallet..."
      );
      console.log("Payment initiated! Please approve in your wallet");

      // Update UI to show payment is in progress
      setPaymentStatus("awaiting_approval");
      setTransactionPollingActive(true);

      // Set up transaction timeout
      const timeoutId = setupTransactionTimeout();

      // Store the payment header for later use
      const storedPaymentHeader = paymentHeader;

      // Extract the transaction signature from the payment header
      let txSignature = "";
      try {
        const payloadData = JSON.parse(atob(paymentHeader));
        txSignature = payloadData.signature;
        setSolanaPaymentTxHash(txSignature);
      } catch (error) {
        console.error("Error extracting transaction signature:", error);
      }

      // Check transaction status function
      const checkTransactionStatus = async (signature: string) => {
        if (!signature || !transactionPollingActive) {
          return;
        }

        try {
          // Wait for the transaction to be confirmed
          const statusResponse = await proxiedRpc
            .getSignatureStatuses([solanaSignature(signature)])
            .send();

          const status = statusResponse.value[0];

          if (
            status &&
            (status.confirmationStatus === "confirmed" ||
              status.confirmationStatus === "finalized")
          ) {
            // Transaction is confirmed, clear timeout, update UI
            clearTimeout(timeoutId);
            setSolanaStatusMessage("Payment confirmed! Redirecting...");
            setPaymentStatus("paid");
            setTransactionPollingActive(false);
            console.log("Payment confirmed! Redirecting...");

            // Redirect to the resource with the payment header
            window.location.href = `/?402base64=${encodeURIComponent(
              storedPaymentHeader
            )}&prompt=${encodeURIComponent(prompt.trim())}`;
          } else if (status && status.err) {
            // Transaction failed, clear timeout, update UI
            clearTimeout(timeoutId);
            setSolanaStatusMessage(
              "Payment failed: " + JSON.stringify(status.err)
            );
            setPaymentStatus("failed");
            setTransactionPollingActive(false);
            setIsProcessing(false);
            console.error("Payment failed: " + JSON.stringify(status.err));
          } else if (transactionPollingActive) {
            // Transaction is still pending, check again
            setTimeout(
              () => checkTransactionStatus(signature),
              POLL_INTERVAL
            );
          }
        } catch (error) {
          console.error("Error checking transaction status:", error);
          if (transactionPollingActive) {
            // If there was an error, try again
            setTimeout(
              () => checkTransactionStatus(signature),
              POLL_INTERVAL
            );
          }
        }
      };

      // Start checking transaction status
      if (txSignature) {
        checkTransactionStatus(txSignature);
      }
    } catch (error: unknown) {
      // Handle payment creation errors
      const errorMessage = mapTxError(error);
      console.error("Payment error:", errorMessage);
      setSolanaStatusMessage(`Payment failed: ${errorMessage}`);
      setPaymentStatus("failed");
      setIsProcessing(false);
    }
  }, [canSubmitPayment, prompt, setupTransactionTimeout, connectedAccount, setIsProcessing, transactionPollingActive]);

  return (
    <div className="w-full">
      <div className="mb-4">
        {!connectedAccount ? (
          <button
            onClick={handleConnect}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
            disabled={isProcessing}
          >
            Connect Solana Wallet
          </button>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center p-3 bg-purple-100 rounded-lg">
              <div className="text-sm font-medium text-purple-900 truncate">
                Connected: {connectedAccount.address.slice(0, 6)}...{connectedAccount.address.slice(-4)}
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs py-1 px-2 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded transition-colors duration-200"
                disabled={isProcessing}
              >
                Disconnect
              </button>
            </div>

            <button
              onClick={handlePayment}
              className={`w-full py-2 px-4 font-medium rounded-lg transition-colors duration-200 ${canSubmitPayment()
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
              disabled={!canSubmitPayment()}
            >
              {isProcessing ? "Processing..." : "Pay with Solana"}
            </button>
          </div>
        )}

        {showSolanaWalletOptions && (
          <SolanaWalletPanel
            walletOptions={SOLANA_WALLET_OPTIONS}
            onConnect={connectSolanaWallet}
            onClose={() => setShowSolanaWalletOptions(false)}
          />
        )}

        {solanaStatusMessage && (
          <div className="mt-2 text-sm text-center text-gray-600">
            {solanaStatusMessage}
          </div>
        )}

        {paymentStatus !== "not_paid" && (
          <div className="mt-4">
            <TransactionStatus
              status={paymentStatus}
              txHash={solanaPaymentTxHash}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SolanaPayment;
