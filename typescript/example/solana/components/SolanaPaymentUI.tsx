"use client";

import { useContext, useState } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import TransactionStatus from "../../components/TransactionStatus";
import { SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";

interface SolanaPaymentUIProps {
  isProcessing: boolean;
  isPromptValid: () => boolean;
  onSubmitPayment: () => void;
  paymentStatus: string;
  txHash: string;
}

export const SolanaPaymentUI: React.FC<SolanaPaymentUIProps> = ({
  isProcessing,
  isPromptValid,
  onSubmitPayment,
  paymentStatus,
  txHash,
}) => {
  const [selectedAccount] = useContext(SelectedWalletAccountContext);
  const [error, setError] = useState<string | null>(null);

  // Handle wallet errors
  const handleError = (error: Error) => {
    setError(error.message);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  // Check if payment can be submitted
  const canSubmitPayment = () => {
    return !!selectedAccount && isPromptValid() && !isProcessing;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Wallet connection section */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">
          {selectedAccount ? "Wallet Connected" : "Connect your Solana wallet"}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {selectedAccount ? "Ready to pay with Solana" : "Select a wallet to pay with Solana"}
        </p>
        
        <ConnectWalletButton onError={handleError} />
        
        {selectedAccount && (
          <button
            onClick={onSubmitPayment}
            className={`mt-4 w-full py-2 px-4 font-medium rounded-lg transition-colors duration-200 ${
              canSubmitPayment()
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!canSubmitPayment()}
          >
            {isProcessing ? "Processing..." : "Pay with Solana"}
          </button>
        )}
      </div>

      {txHash && <TransactionStatus txHash={txHash} status={paymentStatus} />}
    </div>
  );
};
