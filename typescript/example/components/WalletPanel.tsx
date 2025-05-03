import React from 'react';
import Image from 'next/image';
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
    <div
      className={`w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800 mb-6`}
    >
      <div className="p-6">
        {!connected ? (
          <>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
              {heading}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {subheading}
            </p>
            {options.length ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Select a wallet:
                </p>
                {options.map((o) => (
                  <WalletButton
                    key={o.id}
                    id={o.id}
                    icon={<Image src={o.icon} alt={o.label} width={24} height={24} />}
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
                className={`w-full px-4 py-2.5 ${
                  disabled
                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                    : `${bgClass} text-white`
                } rounded-lg transition-colors duration-200 font-medium`}
              >
                Connect Wallet
              </button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  Wallet Connected
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </p>
              </div>
              <button
                onClick={onDisconnect}
                disabled={disabled}
                className={`px-4 py-2 ${
                  disabled
                    ? "bg-red-100 text-red-300 cursor-not-allowed"
                    : "bg-red-100 hover:bg-red-200 text-red-800"
                } rounded-lg transition-colors duration-200`}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
        {statusMessage && (
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export { WalletPanel };
