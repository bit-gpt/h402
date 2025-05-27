import type { UiWalletAccount } from '@wallet-standard/react';
import { createContext, useState, type ReactNode } from 'react';

export type SelectedWalletAccountState = UiWalletAccount | undefined;

export const SelectedWalletAccountContext = createContext<
  readonly [
    selectedWalletAccount: SelectedWalletAccountState,
    setSelectedWalletAccount: React.Dispatch<React.SetStateAction<SelectedWalletAccountState>>,
  ]
>([
  undefined /* selectedWalletAccount */,
  function setSelectedWalletAccount() {
    /* empty */
  },
]);

interface SelectedWalletAccountProviderProps {
  children: ReactNode;
}

export function SelectedWalletAccountProvider({ children }: SelectedWalletAccountProviderProps) {
  const [selectedWalletAccount, setSelectedWalletAccount] = useState<SelectedWalletAccountState>(undefined);

  return (
    <SelectedWalletAccountContext.Provider value={[selectedWalletAccount, setSelectedWalletAccount]}>
      {children}
    </SelectedWalletAccountContext.Provider>
  );
}
