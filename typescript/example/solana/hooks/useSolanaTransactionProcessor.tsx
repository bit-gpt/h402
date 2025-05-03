"use client";

import { useCallback } from "react";
import { createPayment } from "@bit-gpt/h402";
import { solanaPaymentDetails } from "@/config/paymentDetails";
import { PaymentClient } from "@bit-gpt/h402/types";
import { mapTxError } from "@/lib/mapTxError";
import { UiWallet } from "@wallet-standard/react";

interface TransactionProcessorProps {
  prompt: string;
  connectedAccount: {
    address: string;
    publicKey: Uint8Array | readonly number[];
  } | null;
  selectedWallet: UiWallet | null;
  onTransactionStart: () => void;
  onTransactionSubmitted: (txHash: string) => void;
  onTransactionError: (error: string) => void;
}

export const useSolanaTransactionProcessor = ({
  connectedAccount,
  selectedWallet,
  onTransactionStart,
  onTransactionSubmitted,
  onTransactionError,
}: TransactionProcessorProps) => {
  const createAndSubmitPayment = useCallback(async () => {
    if (!connectedAccount || !selectedWallet) {
      onTransactionError("No wallet connected");
      return;
    }

    try {
      onTransactionStart();

      const dynamicSolanaPaymentDetails = {
        ...solanaPaymentDetails,
        resource: `solana-image-${Date.now()}`,
      };

      const paymentClient: PaymentClient = {
        solanaClient: {
          // Use the connected account address
          publicKey: connectedAccount.address,
          signAndSendTransaction: async (transaction) => {
            try {
              // Check if the wallet supports signTransaction
              if (
                !selectedWallet.features.some(
                  (f: string) =>
                    f.includes("signTransaction") ||
                    f.includes("signAndSendTransaction")
                )
              ) {
                throw new Error(
                  "Selected wallet does not support transaction signing"
                );
              }

              // Use the wallet to sign and send the transaction
              const result = await (
                selectedWallet as any
              ).signAndSendTransaction(transaction);

              if (!result || !result.signature) {
                throw new Error(
                  "Wallet did not return a transaction signature"
                );
              }

              // Return the signature as a string as expected by the PaymentClient interface
              return result.signature;
            } catch (error) {
              console.error("Transaction signing error:", error);
              throw new Error(
                `Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          },
        },
      };

      // Create the payment
      const result = await createPayment(
        dynamicSolanaPaymentDetails,
        paymentClient
      );

      // Extract txHash from the result
      const txHash =
        typeof result === "string" ? result : (result as any).txHash;

      // Notify of successful submission
      onTransactionSubmitted(txHash);
    } catch (error: unknown) {
      console.error("Payment error:", error);
      const errorMessage = mapTxError(
        error instanceof Error ? error : { message: String(error) }
      );
      onTransactionError(errorMessage);
    }
  }, [
    connectedAccount,
    selectedWallet,
    onTransactionStart,
    onTransactionSubmitted,
    onTransactionError,
  ]);

  return { createAndSubmitPayment };
};
