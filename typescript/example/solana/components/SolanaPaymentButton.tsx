"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useConnect, UiWalletAccount } from "@wallet-standard/react";
import { createPayment } from "@bit-gpt/h402";
import { createProxiedSolanaRpc } from "@/solana/lib/proxiedSolanaRpc";
import { PaymentButtonProps, PaymentStatus } from "@/types/payment";
import PaymentButtonUI from "@/components/PaymentButton";

/**
 * Solana-specific payment button component
 * Uses wallet-standard/react hooks for Solana wallet integration
 */
export default function SolanaPaymentButton({
  amount,
  wallet,
  paymentRequirements,
  onSuccess,
  onError,
  className = "",
}: PaymentButtonProps & { wallet: any }) {
  // State for the payment flow
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Simplified ref to track payment attempts
  const paymentAttemptRef = useRef({
    attemptInProgress: false,
  });

  console.log("[DEBUG] SolanaPaymentButton render", {
    status,
    attemptInProgress: paymentAttemptRef.current.attemptInProgress,
  });

  // Get the wallet connection hook
  const [isConnecting, connect] = useConnect(wallet);

  // Handle button click for unified experience
  const handleButtonClick = async () => {
    console.log("[DEBUG] Button clicked", {
      hasAccount: !!selectedAccount,
      currentStatus: status,
    });

    // If no account, connect first
    if (!selectedAccount) {
      await handleConnectWallet();
      return;
    }

    // If already connected, process payment
    setStatus("approving");
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    setErrorMessage(null);
    setStatus("connecting");

    try {
      console.log("[DEBUG] Connecting wallet");

      // Use existing accounts if available, otherwise connect to get accounts
      const accounts =
        wallet.accounts.length > 0 ? wallet.accounts : await connect();

      console.log("[DEBUG] Retrieved accounts", accounts?.length);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }

      setSelectedAccount(accounts[0]);
      setStatus("approving"); // Go directly to payment approval
    } catch (err) {
      console.error("[DEBUG] Wallet connection error:", err);
      setStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
      onError?.(err instanceof Error ? err : new Error(errMsg));
    }
  };

  // Update payment status callbacks
  const handlePaymentSuccess = useCallback(
    (paymentHeader: string, txHash: string) => {
      console.log("[DEBUG] Payment succeeded");
      console.log("[DEBUG] Payment header:", paymentHeader);
      console.log("[DEBUG] Transaction hash:", txHash);
      setStatus("success");

      // Reset payment tracking
      paymentAttemptRef.current.attemptInProgress = false;

      // Add a slight delay before redirecting to ensure UI updates
      setTimeout(() => {
        if (onSuccess) onSuccess(paymentHeader, txHash);
      }, 1000);
    },
    [onSuccess]
  );

  const handlePaymentError = useCallback(
    (err: Error) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log("[DEBUG] Payment error", { errMsg });

      // Check if this is a user cancellation
      const isUserCancellation =
        errMsg.includes("cancelled by user") ||
        errMsg.includes("User rejected");

      // Check if this is a facilitator error using the custom property
      const isFacilitatorError = (err as any).isFacilitatorError === true;

      if (isUserCancellation) {
        console.log("[DEBUG] User cancelled payment");
        // Set status to error so the error message is displayed
        setStatus("error");
        setErrorMessage("Transaction cancelled by user");
      } else if (isFacilitatorError) {
        console.log("[DEBUG] Facilitator service unavailable");
        // Use the specific facilitator_error status
        setStatus("facilitator_error");
        setErrorMessage(
          "Payment verification service is currently unavailable. Please try again later."
        );
      } else {
        setStatus("error");
        setErrorMessage(errMsg);
      }

      // Always reset payment tracking
      paymentAttemptRef.current.attemptInProgress = false;

      if (onError) onError(err instanceof Error ? err : new Error(errMsg));
    },
    [onError]
  );

  const handlePaymentProcessing = useCallback(() => {
    console.log("[DEBUG] Payment processing started");
    setStatus("processing");

    // Mark payment as in progress
    paymentAttemptRef.current.attemptInProgress = true;
  }, []);

  // Button text
  const getButtonText = () => {
    switch (status) {
      case "connecting":
        return "Connecting Wallet...";
      case "approving":
        return "Approve in Wallet...";
      case "processing":
        return "Processing Payment...";
      case "success":
        return "Payment Complete!";
      case "facilitator_error":
        return "Service Unavailable";
      case "error":
        return "Payment Failed";
      default:
        return `Pay - ${amount}`;
    }
  };

  // Determine if the button is disabled
  const isDisabled = isConnecting || ["processing", "success"].includes(status);

  return (
    <div className="flex flex-col w-full">
      {/* Payment processor component that watches for account and status */}
      {selectedAccount &&
        status === "approving" &&
        !paymentAttemptRef.current.attemptInProgress && (
          <SolanaPaymentProcessor
            account={selectedAccount}
            paymentRequirements={paymentRequirements}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onProcessing={handlePaymentProcessing}
            paymentAttemptRef={paymentAttemptRef}
          />
        )}

      <PaymentButtonUI
        buttonText={getButtonText()}
        status={status}
        errorMessage={errorMessage}
        onClick={handleButtonClick}
        disabled={isDisabled}
        className={className}
      />
    </div>
  );
}

// Payment processor component that can use the hook with a valid account
function SolanaPaymentProcessor({
  account,
  paymentRequirements,
  onSuccess,
  onError,
  onProcessing,
  paymentAttemptRef,
}: {
  account: UiWalletAccount;
  paymentRequirements?: any;
  onSuccess: (paymentHeader: string, txHash: string) => void;
  onError: (error: Error) => void;
  onProcessing: () => void;
  paymentAttemptRef: React.RefObject<{ attemptInProgress: boolean }>;
}) {
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    account,
    "solana:mainnet"
  );

  // Debug - Track if this component has already attempted a payment
  const hasAttemptedRef = useRef(false);

  // Process payment on mount
  useEffect(() => {
    console.log("[DEBUG-PAYMENT-FLOW] SolanaPaymentProcessor mounted", {
      accountAddress: account?.address?.slice(0, 8),
      hasAttempted: hasAttemptedRef.current,
      attemptInProgress: paymentAttemptRef.current?.attemptInProgress,
    });

    // Log payment details for debugging
    console.log(
      "[DEBUG-PAYMENT-FLOW] Solana payment details received:",
      JSON.stringify(paymentRequirements, null, 2)
    );

    // Set the appropriate namespace and networkId for Solana
    const finalPaymentRequirements = {
      ...paymentRequirements,
      namespace: "solana",
      networkId: "mainnet",
      scheme: "exact",
      resource: paymentRequirements.resource || "solana-image-generation",
    };
    
    console.log(
      "[DEBUG-PAYMENT-FLOW] Final Solana payment details:",
      JSON.stringify(finalPaymentRequirements, null, 2)
    );

    // Guard against multiple attempts
    if (
      hasAttemptedRef.current ||
      (paymentAttemptRef.current && paymentAttemptRef.current.attemptInProgress)
    ) {
      console.log(
        "[DEBUG-PAYMENT-FLOW] Payment already in progress or attempted, skipping"
      );
      return;
    }

    // Mark as attempted at the component level
    hasAttemptedRef.current = true;

    // Call processing callback - this will update the parent's ref
    onProcessing();

    const processPayment = async () => {
      try {
        if (!transactionSendingSigner) {
          throw new Error("Solana transaction signer not available");
        }

        // Create proxied RPC client and use the transaction signer
        const proxiedRpc = createProxiedSolanaRpc();

        // Ensure we have a valid signAndSendTransaction function
        const signAndSendTransactionFn =
          transactionSendingSigner?.signAndSendTransactions;

        if (!signAndSendTransactionFn) {
          console.warn(
            "[DEBUG] Warning: signAndSendTransaction function is missing"
          );
        }

        const paymentClients = {
          solanaClient: {
            publicKey: account.address,
            rpc: proxiedRpc,
            signAndSendTransaction: signAndSendTransactionFn,
          },
        };

        let paymentHeader;
        try {
          // Create payment using the h402 payment library
          paymentHeader = await createPayment(
            finalPaymentRequirements,
            paymentClients
          );

          console.log(
            "[DEBUG-PAYMENT-FLOW] createPayment succeeded with header:",
            paymentHeader
          );
        } catch (error) {
          const paymentError = error as Error;
          console.error(
            "[DEBUG-PAYMENT-FLOW] createPayment failed with error:",
            paymentError
          );
          throw paymentError;
        }

        // We need to extract the transaction hash from the payment header
        // The payment header contains the transaction signature
        let txHash = "";
        
        // Log the full payment header for debugging
        console.log("[DEBUG] Full payment header:", paymentHeader);
        
        // First attempt: Try to parse the payment header as base64 encoded JSON
        if (paymentHeader && typeof paymentHeader === "string") {
          try {
            // Try to decode as base64
            const decodedHeader = Buffer.from(paymentHeader, "base64").toString();
            console.log("[DEBUG] Decoded payment header:", decodedHeader);
            
            try {
              // Try to parse as JSON
              const payloadObj = JSON.parse(decodedHeader);
              console.log("[DEBUG] Parsed payload:", payloadObj);
              
              // Extract signature from the payload if available
              if (payloadObj && payloadObj.payload) {
                if (payloadObj.payload.signature) {
                  txHash = payloadObj.payload.signature;
                } else if (payloadObj.payload.transaction && payloadObj.payload.transaction.signature) {
                  txHash = payloadObj.payload.transaction.signature;
                }
              }
            } catch (error) {
              console.log("[DEBUG] Not valid JSON, trying regex extraction:", String(error));
            }
          } catch (error) {
            console.log("[DEBUG] Not valid base64, trying regex extraction:", String(error));
          }
          
          // Second attempt: If we couldn't extract the hash from JSON, try regex
          if (!txHash) {
            // Look for Solana transaction signature pattern in the payment header
            // Solana signatures are base58 encoded and typically 43-88 characters
            const txHashRegex = /[1-9A-HJ-NP-Za-km-z]{43,88}/g;
            const matches = paymentHeader.match(txHashRegex);
            
            if (matches && matches.length > 0) {
              // Use the last match as it's most likely to be the transaction signature
              txHash = matches[matches.length - 1];
              console.log("[DEBUG] Extracted transaction hash using regex:", txHash);
            }
          }
          
          // Third attempt: Look for a specific pattern in the payment header
          // Based on the logs, the transaction hash might be after specific identifiers
          if (!txHash) {
            const parts = paymentHeader.split(":");
            if (parts.length > 2) {
              // Try the last part as it might be the transaction hash
              const lastPart = parts[parts.length - 1];
              if (lastPart && lastPart.length > 30) {
                txHash = lastPart;
                console.log("[DEBUG] Extracted transaction hash from split:", txHash);
              }
            }
          }
        }
        
        // Log the final extracted transaction hash
        console.log("[DEBUG] Final transaction hash:", txHash);

        console.log("[DEBUG] Payment completed successfully");
        // Call success callback
        onSuccess(paymentHeader, txHash);
      } catch (err) {
        console.error("[DEBUG] Payment error:", err);

        // Check if this is a user rejection or facilitator error
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log("[DEBUG] Error message:", errorMessage);

        // Check for facilitator unavailability
        const isFacilitatorUnavailable =
          errorMessage.includes("Facilitator service unavailable") ||
          errorMessage.includes(
            "Payment verification service is currently unavailable"
          ) ||
          errorMessage.includes("fetch failed");

        const isUserRejection = errorMessage.includes(
          "User rejected the request"
        );

        console.log("[DEBUG] Is user rejection:", isUserRejection);
        console.log(
          "[DEBUG] Is facilitator unavailable:",
          isFacilitatorUnavailable
        );

        if (isUserRejection) {
          console.log(
            "[DEBUG] Transaction was rejected by user, handling gracefully"
          );
          onError(new Error("Transaction cancelled by user"));
        } else if (isFacilitatorUnavailable) {
          console.log(
            "[DEBUG] Facilitator service is unavailable, displaying friendly error"
          );
          // Create a custom error with a special type property for the parent component to identify
          const facilitatorError = new Error(
            "Payment verification service is currently unavailable. Please try again later."
          );
          // Add a custom property to identify this as a facilitator error
          Object.defineProperty(facilitatorError, "isFacilitatorError", {
            value: true,
            enumerable: true,
          });
          onError(facilitatorError);
        } else {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    processPayment();

    // Clean up function
    return () => {
      console.log("[DEBUG] SolanaPaymentProcessor unmounting");
    };
  }, [
    account,
    paymentRequirements,
    transactionSendingSigner,
    onSuccess,
    onError,
    onProcessing,
    paymentAttemptRef,
  ]);

  // This component doesn't render anything
  return null;
}
