import { UiWallet, useDisconnect } from "@wallet-standard/react";

// Props for the connected state with Solana wallet
export interface SolanaConnectedWalletPanelProps {
  connectedAddress: string;
  statusMessage: string;
  wallet: UiWallet;
  onDisconnected: () => void; // Callback for when disconnection is complete
  disabled?: boolean;
}

// Component for the connected state with Solana wallet
export function SolanaConnectedWalletPanel({
  connectedAddress,
  statusMessage,
  wallet,
  onDisconnected,
  disabled = false,
}: SolanaConnectedWalletPanelProps) {
  // Use the wallet standard hook for disconnection
  const [, disconnect] = useDisconnect(wallet);

  // Handle disconnect button click
  const handleDisconnect = async () => {
    try {
      await disconnect();
      onDisconnected();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  return (
    <div className="card mb-6">
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-primary">Wallet Connected</p>
              <p className="text-sm text-blue-text font-mono">
                {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disabled}
              className="button px-4 py-2 flex items-center justify-center rounded-lg font-medium transition-all duration-200 bg-[var(--color-red)] hover:bg-[var(--color-red-hover)] text-[var(--color-red-text)]"
            >
              Disconnect
            </button>
          </div>
          {statusMessage && (
            <p className="mt-4 text-secondary">{statusMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
