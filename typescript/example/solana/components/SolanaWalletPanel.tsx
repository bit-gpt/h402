import React from "react";
import { WalletPanel } from "../../components/WalletPanel";
import { WalletOption } from "@/config/walletOptions";

interface SolanaWalletPanelProps {
  connectedAccount: {
    address: string;
    publicKey: Uint8Array;
  } | null;
  statusMessage: string;
  onConnect: (walletId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  showWalletOptions: boolean;
  walletOptions: WalletOption<string>[];
  onWalletSelect: (walletId: string) => Promise<void>;
  onSubmit: () => void;
  canSubmit: boolean;
  isProcessing: boolean;
}

const SolanaWalletPanel: React.FC<SolanaWalletPanelProps> = ({
  connectedAccount,
  statusMessage,
  onConnect,
  onDisconnect,
  showWalletOptions,
  walletOptions,
  onWalletSelect,
  onSubmit,
  canSubmit,
  isProcessing,
}) => {
  return (
    <div className="w-full">
      {!connectedAccount ? (
        <>
          <WalletPanel
            connected={false}
            connectedAddress=""
            statusMessage={statusMessage}
            onConnect={() => onConnect("")}
            onDisconnect={onDisconnect}
            options={showWalletOptions ? walletOptions : []}
            onSelectOption={onWalletSelect}
            bgClass="bg-purple-600 hover:bg-purple-700"
            heading="Connect your Solana wallet"
            subheading="Select a wallet to pay with Solana"
            disabled={isProcessing}
          />
        </>
      ) : (
        <>
          <WalletPanel
            connected={true}
            connectedAddress={connectedAccount.address}
            statusMessage={statusMessage}
            onConnect={() => onConnect("")}
            onDisconnect={onDisconnect}
            options={[]}
            onSelectOption={() => {}}
            bgClass="bg-purple-600 hover:bg-purple-700"
            heading="Wallet Connected"
            subheading="Ready to pay with Solana"
            disabled={isProcessing}
          />
          <button
            onClick={onSubmit}
            className={`w-full py-2 px-4 font-medium rounded-lg transition-colors duration-200 ${
              canSubmit
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!canSubmit || isProcessing}
          >
            {isProcessing ? "Processing..." : "Pay with Solana"}
          </button>
        </>
      )}
    </div>
  );
};

export default SolanaWalletPanel;
