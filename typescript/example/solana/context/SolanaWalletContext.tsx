"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { useWallets, useConnect, useDisconnect, type UiWallet } from "@wallet-standard/react";

// Define the account structure
export interface ConnectedAccount {
  address: string;
  publicKey: Uint8Array | readonly number[];
}

// Define the context state type
type SolanaWalletState = {
  wallet: UiWallet | null;
  account: ConnectedAccount | null;
  status: string;
  isConnecting: boolean;
};

// Define the context setter type
type SolanaWalletSetter = (action: {
  type: 'connect' | 'disconnect' | 'setStatus';
  payload?: any;
}) => Promise<void>;

// Create the context with default values
const SolanaWalletContext = createContext<[SolanaWalletState, SolanaWalletSetter]>([
  { wallet: null, account: null, status: "", isConnecting: false },
  async () => {}
]);

// Provider component
export const SolanaWalletProvider = ({ children }: { children: ReactNode }) => {
  // State
  const wallets = useWallets();
  const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  
  // Hooks from wallet standard
  const [isConnecting, connect] = useConnect(selectedWallet as UiWallet);
  const [, disconnect] = useDisconnect(selectedWallet as UiWallet);
  
  // Create the state object
  const state: SolanaWalletState = {
    wallet: selectedWallet,
    account: connectedAccount,
    status: statusMessage,
    isConnecting
  };
  
  // Create the setter function
  const setter: SolanaWalletSetter = useCallback(async (action) => {
    const { type, payload } = action;
    
    switch (type) {
      case 'connect':
        try {
          const walletId = payload as string;
          setStatusMessage("Connecting to wallet...");
          console.log("Connecting to wallet:", walletId);

          // Find the wallet by ID
          const wallet = wallets.find(w => w.name.toLowerCase() === walletId.toLowerCase());
          
          if (wallet) {
            setSelectedWallet(wallet);
            setStatusMessage(`Connecting to ${wallet.name}...`);
            
            // Connect to the wallet
            const accounts = await connect();
            
            if (accounts && accounts.length > 0) {
              const account = accounts[0];
              // Store the connected account information
              setConnectedAccount({
                address: account.address,
                publicKey: account.publicKey as unknown as Uint8Array
              });
              setStatusMessage(`Connected to ${wallet.name}`);
            } else {
              throw new Error(`No accounts available in ${wallet.name}`);
            }
          } else {
            setStatusMessage(`Wallet ${walletId} not found or not supported`);
          }
        } catch (error: unknown) {
          console.error("Wallet connect error:", error);
          setStatusMessage(
            `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
          );
          setSelectedWallet(null);
        }
        break;
        
      case 'disconnect':
        try {
          if (selectedWallet) {
            await disconnect();
          }
          setConnectedAccount(null);
          setSelectedWallet(null);
          setStatusMessage("Wallet disconnected");
        } catch (error) {
          console.error("Wallet disconnect error:", error);
          setStatusMessage("Failed to disconnect wallet");
        }
        break;
        
      case 'setStatus':
        setStatusMessage(payload as string);
        break;
    }
  }, [wallets, connect, disconnect, selectedWallet]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<[SolanaWalletState, SolanaWalletSetter]>(
    () => [state, setter],
    [state, setter]
  );
  
  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useSolanaWallet = () => useContext(SolanaWalletContext);
