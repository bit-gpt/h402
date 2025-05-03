import React from 'react';
import SolanaWalletButton from './SolanaWalletButton';
import { WalletOption } from '@/config/walletOptions';

interface WalletPanelProps {
  walletOptions: WalletOption<string>[];
  onConnect: (walletId: string) => Promise<void>;
  onClose: () => void;
}

const WalletPanel: React.FC<WalletPanelProps> = ({
  walletOptions,
  onConnect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select a wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          {walletOptions.map((option) => (
            <SolanaWalletButton
              key={option.id}
              id={option.id}
              icon={option.icon}
              label={option.label}
              onClick={onConnect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletPanel;
