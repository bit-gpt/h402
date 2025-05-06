import Image from "next/image";
import WalletButton from "./WalletButton";
import { WalletOption, GenericWalletId } from "../config/walletOptions";

// Props for the disconnected state
export interface DisconnectedWalletPanelProps<T extends GenericWalletId> {
  statusMessage: string;
  onConnect: () => void;
  options: WalletOption<T>[];
  onSelectOption: (id: T) => void | Promise<void>;
  bgClass: string;
  heading: string;
  subheading: string;
  disabled?: boolean;
}

// Component for the disconnected state
export function DisconnectedWalletPanel<T extends GenericWalletId>({
  statusMessage,
  onConnect,
  options,
  onSelectOption,
  bgClass,
  heading,
  subheading,
  disabled = false,
}: DisconnectedWalletPanelProps<T>) {
  return (
    <div className="card mb-6">
      <div className="p-6">
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
        {statusMessage && (
          <p className="mt-4 text-secondary">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
