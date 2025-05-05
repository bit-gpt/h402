"use client";

import {
  getUiWalletAccountStorageKey,
  UiWallet,
  UiWalletAccount,
  uiWalletAccountBelongsToUiWallet,
  uiWalletAccountsAreSame,
  useWallets,
} from "@wallet-standard/react";
import { createContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";

// Define the selected wallet account state type
export type SelectedWalletAccountState = UiWalletAccount | undefined;

// Create the context with default values
export const SelectedWalletAccountContext = createContext<
  [
    SelectedWalletAccountState,
    React.Dispatch<React.SetStateAction<SelectedWalletAccountState>>,
  ]
>([undefined, () => {}]);

// Storage key for persisting the selected wallet and account
const STORAGE_KEY = "h402-solana-wallet:selected-wallet-and-address";

// Track if the setter was explicitly invoked by user action
let wasSetterInvoked = false;

/**
 * Get the saved wallet account from local storage
 */
function getSavedWalletAccount(
  wallets: readonly UiWallet[]
): UiWalletAccount | undefined {
  if (wasSetterInvoked) {
    // After the user makes an explicit choice of wallet, stop trying to auto-select the
    // saved wallet, if and when it appears.
    return;
  }

  // Check if we're in a browser environment
  if (typeof localStorage === "undefined") {
    return;
  }

  const savedWalletNameAndAddress = localStorage.getItem(STORAGE_KEY);
  if (
    !savedWalletNameAndAddress ||
    typeof savedWalletNameAndAddress !== "string"
  ) {
    return;
  }

  const [savedWalletName, savedAccountAddress] =
    savedWalletNameAndAddress.split(":");
  if (!savedWalletName || !savedAccountAddress) {
    return;
  }

  for (const wallet of wallets) {
    if (wallet.name === savedWalletName) {
      for (const account of wallet.accounts) {
        if (account.address === savedAccountAddress) {
          return account;
        }
      }
    }
  }
}

/**
 * Provider component that manages the selected wallet account
 * Saves the selected wallet account's storage key to the browser's local storage.
 * In future sessions it will try to return that same wallet account, or at least
 * one from the same brand of wallet if the wallet from which it came is still
 * in the Wallet Standard registry.
 */
export function SelectedWalletAccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const wallets = useWallets();
  const [selectedWalletAccount, setSelectedWalletAccountInternal] =
    useState<SelectedWalletAccountState>(() => getSavedWalletAccount(wallets));

  // Wrapper for the setter that also persists to localStorage
  const setSelectedWalletAccount = useCallback((setStateAction: React.SetStateAction<SelectedWalletAccountState>) => {
    setSelectedWalletAccountInternal((prevSelectedWalletAccount) => {
      wasSetterInvoked = true;

      const nextWalletAccount =
        typeof setStateAction === "function"
          ? setStateAction(prevSelectedWalletAccount)
          : setStateAction;

      // Only persist if we're in a browser environment
      if (typeof localStorage !== "undefined") {
        const accountKey = nextWalletAccount
          ? getUiWalletAccountStorageKey(nextWalletAccount)
          : undefined;

        if (accountKey) {
          localStorage.setItem(STORAGE_KEY, accountKey);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      return nextWalletAccount;
    });
  }, []);  // Empty dependency array since it doesn't depend on any props or state

  // Try to recover the saved wallet account when wallets change
  useEffect(() => {
    const savedWalletAccount = getSavedWalletAccount(wallets);
    if (savedWalletAccount) {
      setSelectedWalletAccountInternal(savedWalletAccount);
    }
  }, [wallets]);

  // Find the current wallet account from the available wallets
  const walletAccount = useMemo(() => {
    if (selectedWalletAccount) {
      for (const uiWallet of wallets) {
        for (const uiWalletAccount of uiWallet.accounts) {
          if (uiWalletAccountsAreSame(selectedWalletAccount, uiWalletAccount)) {
            return uiWalletAccount;
          }
        }

        // If the selected account belongs to this connected wallet, at least,
        // then select one of its accounts.
        if (
          uiWalletAccountBelongsToUiWallet(selectedWalletAccount, uiWallet) &&
          uiWallet.accounts[0]
        ) {
          return uiWallet.accounts[0];
        }
      }
    }
    return undefined;
  }, [selectedWalletAccount, wallets]);

  // If there is a selected wallet account but the wallet to which it belongs
  // has since disconnected, clear the selected wallet.
  useEffect(() => {
    if (selectedWalletAccount && !walletAccount) {
      setSelectedWalletAccountInternal(undefined);
    }
  }, [selectedWalletAccount, walletAccount]);

  // Create the context value
  const contextValue = useMemo(
    () => [walletAccount, setSelectedWalletAccount] as [
      SelectedWalletAccountState,
      React.Dispatch<React.SetStateAction<SelectedWalletAccountState>>
    ],
    [walletAccount, setSelectedWalletAccount]
  );

  return (
    <SelectedWalletAccountContext.Provider value={contextValue}>
      {children}
    </SelectedWalletAccountContext.Provider>
  );
}
