"use client";

import { useCallback, useContext, useState } from "react";
import {
  UiWallet,
  UiWalletAccount,
  useConnect,
  useDisconnect,
  useWallets,
} from "@wallet-standard/react";
import { SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";

interface ConnectWalletButtonProps {
  onError?: (error: Error) => void;
}

export function ConnectWalletButton({ onError }: ConnectWalletButtonProps) {
  const wallets = useWallets();
  const [selectedWalletAccount, setSelectedWalletAccount] = useContext(
    SelectedWalletAccountContext
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Find the wallet that owns the selected account
  const selectedWallet = selectedWalletAccount
    ? wallets.find((wallet) =>
        wallet.accounts.some(
          (account) => account.address === selectedWalletAccount.address
        )
      )
    : undefined;

  // Handle errors
  const handleError = useCallback(
    (error: unknown) => {
      console.error("Wallet error:", error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    },
    [onError]
  );

  // Render the connect button when no wallet is connected
  if (!selectedWalletAccount) {
    return (
      <WalletSelector
        onError={handleError}
        onSelect={setSelectedWalletAccount}
      />
    );
  }
  
  // If we have an account but can't find the wallet, show an error state
  if (!selectedWallet) {
    return (
      <button 
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
        onClick={() => setSelectedWalletAccount(undefined)}
      >
        Wallet Not Found - Disconnect
      </button>
    );
  }

  // Render the connected wallet button only when we have both account and wallet
  return (
    <ConnectedWalletButton
      account={selectedWalletAccount}
      isOpen={isDropdownOpen}
      onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
      onDisconnect={() => setSelectedWalletAccount(undefined)}
      onError={handleError}
      wallet={selectedWallet}
    />
  );
}

// Component for selecting a wallet
function WalletSelector({
  onError,
  onSelect,
}: {
  onError: (error: unknown) => void;
  onSelect: (account: UiWalletAccount) => void;
}) {
  const wallets = useWallets();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // No wallets available
  if (wallets.length === 0) {
    return (
      <button
        className="px-4 py-2 bg-purple-600 text-white rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        No wallets found
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        Connect Wallet
      </button>

      {isDropdownOpen && (
        <div className="absolute mt-2 w-56 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            {wallets.map((wallet) => (
              <WalletOption
                key={wallet.name}
                wallet={wallet}
                onSelect={onSelect}
                onError={onError}
                onClose={() => setIsDropdownOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for a single wallet option
function WalletOption({
  wallet,
  onSelect,
  onError,
  onClose,
}: {
  wallet: UiWallet;
  onSelect: (account: UiWalletAccount) => void;
  onError: (error: unknown) => void;
  onClose: () => void;
}) {
  const [isConnecting, connect] = useConnect(wallet);

  const handleConnect = useCallback(async () => {
    try {
      const accounts = await connect();
      if (accounts && accounts.length > 0) {
        onSelect(accounts[0]);
        onClose();
      } else {
        throw new Error(`No accounts available in ${wallet.name}`);
      }
    } catch (error) {
      onError(error);
    }
  }, [connect, onSelect, onError, onClose, wallet.name]);

  return (
    <button
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {wallet.icon && (
        <img
          src={wallet.icon}
          alt={`${wallet.name} icon`}
          className="w-5 h-5 mr-2"
        />
      )}
      <span>{wallet.name}</span>
      {isConnecting && <span className="ml-2">Connecting...</span>}
    </button>
  );
}

// Component for the connected wallet button
function ConnectedWalletButton({
  account,
  isOpen,
  onToggleDropdown,
  onDisconnect,
  onError,
  wallet,
}: {
  account: UiWalletAccount;
  isOpen: boolean;
  onToggleDropdown: () => void;
  onDisconnect: () => void;
  onError: (error: unknown) => void;
  wallet: UiWallet;
}) {
  // Use disconnect hook if wallet is available
  const [isDisconnecting, disconnect] = useDisconnect(wallet);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      onDisconnect();
    } catch (error) {
      onError(error);
    }
  }, [disconnect, onDisconnect, onError]);

  // Format the address for display
  const formattedAddress = `${account.address.slice(0, 4)}...${account.address.slice(-4)}`;

  return (
    <div className="relative">
      <button
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        onClick={onToggleDropdown}
      >
        {formattedAddress}
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-500">
              {account.address}
            </div>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
