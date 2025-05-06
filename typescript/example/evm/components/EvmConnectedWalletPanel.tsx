export interface EvmConnectedWalletPanelProps {
  connectedAddress: string;
  statusMessage: string;
  onDisconnect: () => void | Promise<void>;
  disabled?: boolean;
}

// Component for the connected state with any wallet (generic)
export function EvmConnectedWalletPanel({
  connectedAddress,
  statusMessage,
  onDisconnect,
  disabled = false,
}: EvmConnectedWalletPanelProps) {
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
              onClick={onDisconnect}
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
