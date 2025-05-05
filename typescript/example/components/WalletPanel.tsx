import Image from "next/image";
import WalletButton from "./WalletButton";
import { WalletOption, GenericWalletId } from "../config/walletOptions";

interface Props<T extends GenericWalletId> {
  connected: boolean;
  connectedAddress: string;
  statusMessage: string;
  onConnect: () => void;
  onDisconnect: () => void | Promise<void>;
  options: WalletOption<T>[];
  onSelectOption: (id: T) => void | Promise<void>;
  /** tailwind classes to differentiate colours */
  bgClass: string;
  heading: string;
  subheading: string;
  disabled?: boolean;
}

function WalletPanel<T extends GenericWalletId>({
  connected,
  connectedAddress,
  statusMessage,
  onConnect,
  onDisconnect,
  options,
  onSelectOption,
  bgClass,
  heading,
  subheading,
  disabled = false,
}: Props<T>) {
  return (
    <div className="card mb-6">
      <div className="p-6">
        {!connected ? (
          <>
            <p className="font-medium mb-2 text-primary">{heading}</p>
            <p className="text-sm mb-4 text-secondary">{subheading}</p>
            {options.length ? (
              <div className="space-y-3">
                <p className="text-sm mb-2 text-tertiary">Select a wallet:</p>
                {options.map((o) => (
                  <WalletButton
                    key={o.id}
                    id={o.id}
                    icon={
                      <Image
                        src={o.icon}
                        alt={o.label}
                        width={24}
                        height={24}
                      />
                    }
                    label={o.label}
                    onClick={onSelectOption}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={disabled}
                className={`button w-full px-4 py-2.5 flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                  disabled ? "" : `${bgClass} text-white hover:opacity-90`
                }`}
              >
                Connect Wallet
              </button>
            )}
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export { WalletPanel };
