"use client";

import { useState } from "react";
import SolanaWalletPanel from "@/solana/components/SolanaWalletPanel";
import { SOLANA_WALLET_OPTIONS } from "@/config/walletOptions";
import TransactionStatus from "../../components/TransactionStatus";
import { useSolanaWallet } from "@/solana/context/SolanaWalletContext";

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
  const [{ account, status }, walletActions] = useSolanaWallet();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Ensure account has the correct type for SolanaWalletPanel
  const formattedAccount: { address: string; publicKey: Uint8Array } | null = account ? {
    address: account.address,
    publicKey: Array.isArray(account.publicKey) 
      ? new Uint8Array(account.publicKey) 
      : account.publicKey as Uint8Array
  } : null;

  // Check if payment can be submitted
  const canSubmitPayment = () => {
    return !!account && isPromptValid() && !isProcessing;
  };

  // Handle wallet connection
  const handleConnect = async (walletId: string): Promise<void> => {
    // If a walletId is provided, connect to that wallet directly
    if (walletId) {
      return handleWalletSelect(walletId);
    }
    // Otherwise, show wallet options
    setShowWalletOptions(true);
    return Promise.resolve();
  };

  // Handle wallet selection
  const handleWalletSelect = async (walletId: string) => {
    await walletActions({ type: "connect", payload: walletId });
    setShowWalletOptions(false);
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    await walletActions({ type: "disconnect" });
  };

  return (
    <div className="flex flex-col gap-4">
      <SolanaWalletPanel
        connectedAccount={formattedAccount}
        statusMessage={status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        showWalletOptions={showWalletOptions}
        walletOptions={SOLANA_WALLET_OPTIONS}
        onWalletSelect={handleWalletSelect}
        onSubmit={onSubmitPayment}
        canSubmit={canSubmitPayment()}
        isProcessing={isProcessing}
      />

      {txHash && <TransactionStatus txHash={txHash} status={paymentStatus} />}
    </div>
  );
};
