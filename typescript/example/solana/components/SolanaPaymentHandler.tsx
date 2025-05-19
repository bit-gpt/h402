"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useConnect, UiWalletAccount } from "@wallet-standard/react";
import { createPayment } from "@bit-gpt/h402";
import { createProxiedSolanaRpc } from "@/solana/lib/proxiedSolanaRpc";
import { PaymentButtonProps } from "@/types/payment";
import PaymentButtonUI from "@/components/PaymentButton";

/**
 * Solana-specific payment handler
 * Uses wallet-standard/react hooks for Solana wallet integration
 */
export default function SolanaPaymentHandler({
  amount,
  wallet,
  paymentRequirements,
  onSuccess,
  onError,
  paymentStatus,
  setPaymentStatus,
  className = "",
}: PaymentButtonProps & { wallet: any }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Simplified ref to track payment attempts
  const paymentAttemptRef = useRef({ attemptInProgress: false });

  // Get the wallet connection hook
  const [isConnecting, connect] = useConnect(wallet);

  // Handle button click for unified experience
  // If no account, connect first
  // If already connected, start processing payment
  const handleButtonClick = async () => {
    console.log("[DEBUG] Button clicked", {
      selectedAccountAddress: selectedAccount?.address,
      currentStatus: paymentStatus,
    });
    // If no account, connect first
    if (!selectedAccount) {
      await handleConnectWallet();
      return;
    }
    // If already connected, start processing payment
    setPaymentStatus("approving");
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    setErrorMessage(null);
    setPaymentStatus("connecting");

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
      // Set the status to approving to show tx approval in walet
      setPaymentStatus("approving");
    } catch (err) {
      console.error("[DEBUG] Wallet connection error:", err);
      setPaymentStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
      onError?.(err instanceof Error ? err : new Error(errMsg));
    }
  };

  // Update payment status callbacks
  const handlePaymentSuccess = useCallback(
    (paymentHeader: string, txHash: string) => {
      console.log("[DEBUG] Payment sent and signed");
      console.log("[DEBUG] Payment header:", paymentHeader);
      console.log("[DEBUG] Transaction hash:", txHash);

      // Keep the processing state - we'll let the parent component set success
      // after facilitator verifies the transaction

      // Call onSuccess immediately - the parent will handle facilitator verification
      // Pass setStatus so the parent can update our status after facilitator verification
      if (onSuccess) onSuccess(paymentHeader, txHash);
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
        setPaymentStatus("error");
        setErrorMessage("Transaction cancelled by user");
      } else if (isFacilitatorError) {
        console.log("[DEBUG] Facilitator service unavailable");
        // Use the specific facilitator_error status
        setPaymentStatus("facilitator_error");
        setErrorMessage(
          "Payment verification service is currently unavailable. Please try again later."
        );
      } else {
        setPaymentStatus("error");
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
    setPaymentStatus("processing");
    paymentAttemptRef.current.attemptInProgress = true;
  }, []);

  // Determine if the button is disabled
  const isDisabled =
    isConnecting || ["processing", "success"].includes(paymentStatus);

  return (
    <div className="flex flex-col w-full">
      {/* Payment processor component that watches for account and status */}
      {selectedAccount &&
        paymentStatus === "approving" &&
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
        paymentStatus={paymentStatus}
        amount={amount}
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

    const processPayment = async () => {
      try {
        if (!transactionSendingSigner) {
          throw new Error("Solana transaction signer not available");
        }

        // Create proxied RPC client
        // This is necessary because you should face error 403 if trying to use public RPC from client
        const proxiedRpc = createProxiedSolanaRpc();

        const signAndSendTransactionFn =
          transactionSendingSigner?.signAndSendTransactions;

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
          // At this point the user will be prompted to approve the transaction
          paymentHeader = await createPayment(
            finalPaymentRequirements,
            paymentClients
          );

          // If we get here, it means the user has approved the transaction
          // Now we can set the processing state as we wait for confirmation
          onProcessing();
        } catch (error) {
          const paymentError = error as Error;
          throw paymentError;
        }

        // We need to extract the transaction hash from the payment header
        // The payment header contains the transaction signature
        let txHash = "";

        // First attempt: Try to parse the payment header as base64 encoded JSON
        if (paymentHeader && typeof paymentHeader === "string") {
          try {
            const decodedHeader = Buffer.from(
              paymentHeader,
              "base64"
            ).toString();
            console.log("[DEBUG] Decoded payment header:", decodedHeader);
            const payloadObj = JSON.parse(decodedHeader);
            console.log("[DEBUG] Parsed payload:", payloadObj);
            // Extract signature from the payload if available
            if (payloadObj && payloadObj.payload) {
              if (payloadObj.payload.signature) {
                txHash = payloadObj.payload.signature;
              } else if (
                payloadObj.payload.transaction &&
                payloadObj.payload.transaction.signature
              ) {
                txHash = payloadObj.payload.transaction.signature;
              }
            }
          } catch (error) {
            console.log("[DEBUG] Not valid base64:", String(error));
          }
        }
        // Call success callback
        onSuccess(paymentHeader, txHash);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
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

        if (isUserRejection) {
          onError(new Error("Transaction cancelled by user"));
        } else if (isFacilitatorUnavailable) {
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
      paymentAttemptRef.current.attemptInProgress = false;
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
