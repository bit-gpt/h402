import { useState, useEffect } from "react";

export function useWalletDetection(evmAddress: string | undefined) {
  const [isTrueEvmProvider, setIsTrueEvmProvider] = useState(false);

  // Detect wallet providers on client side
  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectWalletProviders = () => {
      const hasPhantom = !!window.isPhantomInstalled || !!window.phantom;
      const hasEthereumProvider = !!window.ethereum;
      const hasProvidersArray =
        hasEthereumProvider &&
        window.ethereum?.providers &&
        Array.isArray(window.ethereum.providers);

      // Check for true EVM provider (not just Phantom spoofing as MetaMask)
      let hasTrueEvmProvider = false;

      if (hasProvidersArray) {
        // If we have a providers array, check for a true MetaMask provider that isn't Phantom
        hasTrueEvmProvider = window.ethereum.providers.some(
          (provider: { isMetaMask: any; isPhantom: any }) =>
            provider.isMetaMask && !provider.isPhantom
        );
      } else if (hasEthereumProvider) {
        // If we have a single ethereum provider
        if (window.ethereum.isPhantom) {
          // If it's explicitly marked as Phantom, it's not a true EVM provider
          hasTrueEvmProvider = false;
        } else {
          // Otherwise, check if it's MetaMask
          hasTrueEvmProvider = window.ethereum.isMetaMask === true;
        }
      }

      setIsTrueEvmProvider(hasTrueEvmProvider);

      console.log({
        hasPhantom,
        hasEthereumProvider,
        hasProvidersArray,
        hasTrueEvmProvider,
        evmAddress: evmAddress || "Not connected",
      });
    };

    detectWalletProviders();
  }, [evmAddress]);

  return { isTrueEvmProvider };
}
