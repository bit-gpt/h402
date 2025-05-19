"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallets } from "@wallet-standard/react";
import { useIsDarkMode } from "./ThemeProvider";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
import { Coin, Network, PaymentStatus, PaymentUIProps } from "@/types/payment";
import {
  generateAvailableNetworks,
  getCompatiblePaymentRequirements,
  normalizePaymentMethods,
} from "@/utils/paymentUtils";
import {
  CancelButton,
  Dropdown,
  ErrorMessage,
  NoPaymentOptions,
} from "@/components/PaywallComponents";
import { useWalletDetection } from "@/hooks/useWalletDetection";
import { useCompatibleWallet } from "@/hooks/useCompatibleWallet";
import SolanaPaymentHandler from "@/solana/components/SolanaPaymentHandler";
import EvmPaymentHandler from "@/evm/components/EvmPaymentHandler";
import { formatAmountForDisplay } from "@/utils/amountFormatting";
import { PaymentRequirements } from "@bit-gpt/h402/types";

/**
 * Payment UI component with network/coin selection
 * and integrated payment button
 */
export default function PaymentUI({
  prompt,
  returnUrl,
  paymentRequirements,
}: PaymentUIProps) {
  const router = useRouter();
  const wallets = useWallets();
  const { connectedAddress: evmAddress } = useEvmWallet();
  const isDarkMode = useIsDarkMode();
  const { isTrueEvmProvider } = useWalletDetection(evmAddress);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [activePaymentRequirements, setActivePaymentRequirements] =
    useState<PaymentRequirements | null>(null);

  // Convert payment details to array if needed
  const paymentMethods = useMemo(
    () => normalizePaymentMethods(paymentRequirements),
    [paymentRequirements]
  );

  // Generate network and coin options from payment requirements
  const availableNetworks = useMemo(
    () => generateAvailableNetworks(paymentMethods),
    [paymentMethods]
  );

  // State for selections - initialize with empty defaults
  const [selectedNetwork, setSelectedNetwork] = useState<Network>({
    id: "",
    name: "",
    icon: "",
    coins: [],
  });

  const [selectedCoin, setSelectedCoin] = useState<Coin>({
    id: "",
    name: "",
    icon: "",
  });

  const [dropdownState, setDropdownState] = useState({
    network: false,
    coin: false,
  });

  const [selectedPaymentMethodIndex, setSelectedPaymentMethodIndex] =
    useState(0);

  // Get compatible wallet
  const { selectedWallet } = useCompatibleWallet(
    selectedNetwork,
    wallets,
    isTrueEvmProvider
  );

  // Reset payment method index when network changes and update selected network
  useEffect(() => {
    setSelectedPaymentMethodIndex(0);

    // If there are available networks
    if (availableNetworks.length > 0) {
      // If the current network is not in the available networks list, select the first available one
      if (
        !availableNetworks.some((network) => network.id === selectedNetwork.id)
      ) {
        setSelectedNetwork(availableNetworks[0]);
        setSelectedCoin(availableNetworks[0].coins[0]);
      }
    }
  }, [selectedNetwork.id, availableNetworks]);

  // Get the active payment requirements based on selected coin
  useEffect(() => {
    console.log(
      "[DEBUG-PAYMENT-FLOW] Getting active payment requirements for network:",
      selectedNetwork.id,
      "and coin:",
      selectedCoin.name
    );

    // Get compatible methods for the selected network
    const compatibleMethods = getCompatiblePaymentRequirements(
      paymentMethods,
      selectedNetwork.id
    );

    if (compatibleMethods.length === 0) {
      console.log("[DEBUG-PAYMENT-FLOW] No compatible payment methods found");
      setActivePaymentRequirements(null);
      return;
    }

    // Find a payment method matching the selected coin
    const matchingPaymentMethod = compatibleMethods.find(
      (method) => method.tokenSymbol === selectedCoin.name
    );

    if (matchingPaymentMethod) {
      console.log(
        "[DEBUG-PAYMENT-FLOW] Found matching payment method for coin:",
        JSON.stringify(matchingPaymentMethod, null, 2)
      );
      setActivePaymentRequirements(matchingPaymentMethod);
      return;
    }

    // If no match found, use the first compatible method
    console.log(
      "[DEBUG-PAYMENT-FLOW] No exact match found, using first compatible method"
    );
    setActivePaymentRequirements(compatibleMethods[0]);
  }, [
    paymentMethods,
    selectedPaymentMethodIndex,
    selectedNetwork.id,
    selectedCoin,
  ]);

  // Event handlers
  const handlePaymentSuccess = async (
    paymentHeader: string,
    txHash: string
  ) => {
    console.log("Payment successful:", paymentHeader);
    console.log("Transaction hash:", txHash);

    if (returnUrl) {
      try {
        console.log("Starting image generation...");
        const response = await fetch(returnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": paymentHeader,
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to start image generation: ${response.status}`
          );
        }

        const data = await response.json();
        if (!data.requestId) {
          throw new Error("No request ID received from server");
        }

        // At this point, the facilitator has verified the transaction
        // Now we can safely set the payment status to success
        setPaymentStatus("success");

        // Start checking the status with the requestId
        await checkImageStatus(15, 2000, data.requestId);
      } catch (error) {
        console.error("Error starting image generation:", error);
        alert("Failed to start image generation. Please try again.");
        window.location.href = "/";
      }
    }
  };

  const checkImageStatus = async (
    retriesLeft: number,
    delay: number,
    requestId: string
  ) => {
    try {
      console.log(`Checking image status (${retriesLeft} retries left)...`);
      const response = await fetch(`/api/generate-image/status/${requestId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "completed" && data.filename) {
        window.location.href = `/image?filename=${data.filename}`;
        return;
      } else if (data.status === "failed") {
        throw new Error(data.error || "Image generation failed");
      } else if (data.status === "processing") {
        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return checkImageStatus(retriesLeft - 1, delay, requestId);
        } else {
          throw new Error("Timed out waiting for image generation");
        }
      } else {
        throw new Error(`Unknown status: ${data.status}`);
      }
    } catch (error) {
      console.error("Error checking image status:", error);
      if (retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return checkImageStatus(retriesLeft - 1, delay, requestId);
      } else {
        alert("Image generation failed. Please try again.");
        window.location.href = "/";
      }
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error("Payment failed:", error);
    // Could add toast notification here
  };

  const toggleDropdown = (dropdownName: "network" | "coin") => {
    setDropdownState((prev) => ({
      ...prev,
      [dropdownName]: !prev[dropdownName],
    }));
  };

  const selectNetwork = (network: Network) => {
    setSelectedNetwork(network);
    setSelectedCoin(network.coins[0]);
    toggleDropdown("network");
  };

  const selectCoin = (coin: Coin) => {
    setSelectedCoin(coin);
    toggleDropdown("coin");
  };

  const renderPaymentButton = () => {
    if (!activePaymentRequirements) {
      return null;
    }

    const isValidMethod =
      activePaymentRequirements.namespace ===
      (selectedNetwork.id === "solana" ? "solana" : "evm");

    // For Solana, we need to check for a compatible wallet
    if (selectedNetwork.id === "solana" && !selectedWallet) {
      return (
        <ErrorMessage
          message="No compatible Solana wallet found. Please install a supported wallet."
          isDarkMode={isDarkMode}
        />
      );
    }

    // For BSC/EVM, we need to check if a true EVM provider is available
    if (selectedNetwork.id === "bsc" && !isTrueEvmProvider) {
      return (
        <ErrorMessage
          message="No compatible EVM wallet found. Please install a supported wallet."
          isDarkMode={isDarkMode}
        />
      );
    }

    // Check if the payment method matches the selected network
    if (!isValidMethod) {
      return (
        <ErrorMessage
          message="Please select a valid payment method."
          isDarkMode={isDarkMode}
        />
      );
    }

    if (selectedNetwork.id === "solana") {
      return (
        <SolanaPaymentHandler
          amount={formatAmountForDisplay({
            amount: activePaymentRequirements.amountRequired?.toString() ?? 0,
            format:
              activePaymentRequirements.amountRequiredFormat ?? "smallestUnit",
            symbol: selectedCoin.name,
            decimals: activePaymentRequirements.tokenDecimals,
          })}
          wallet={selectedWallet}
          prompt={prompt}
          paymentRequirements={activePaymentRequirements}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          setPaymentStatus={setPaymentStatus}
          paymentStatus={paymentStatus}
        />
      );
    } else if (selectedNetwork.id === "bsc") {
      return (
        <EvmPaymentHandler
          amount={formatAmountForDisplay({
            amount: activePaymentRequirements.amountRequired?.toString() ?? 0,
            format:
              activePaymentRequirements.amountRequiredFormat ?? "smallestUnit",
            symbol: selectedCoin.name,
            decimals: activePaymentRequirements.tokenDecimals,
          })}
          prompt={prompt}
          paymentRequirements={activePaymentRequirements}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          setPaymentStatus={setPaymentStatus}
          paymentStatus={paymentStatus}
        />
      );
    }

    return null;
  };

  return (
    <div
      className={`border rounded-lg p-6 shadow-sm ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
    >
      <h2 className="text-xl font-semibold mb-6">Pay from your Wallet</h2>

      {availableNetworks.length === 0 ? (
        <NoPaymentOptions
          returnUrl={returnUrl}
          onReturn={() => router.push(returnUrl || "/")}
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
          {/* Network Selection */}
          {availableNetworks.length > 1 && (
            <Dropdown
              type="network"
              items={availableNetworks}
              selected={selectedNetwork}
              onSelect={selectNetwork}
              isOpen={dropdownState.network}
              toggleDropdown={() => toggleDropdown("network")}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Coin Selection */}
          {selectedNetwork.coins.length > 0 && (
            <Dropdown
              type="coin"
              items={selectedNetwork.coins}
              selected={selectedCoin}
              onSelect={(coin) => selectCoin(coin as Coin)}
              isOpen={dropdownState.coin}
              toggleDropdown={() => toggleDropdown("coin")}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Payment Button */}
          {renderPaymentButton()}

          {/* Return button */}
          {returnUrl && <CancelButton onReturn={() => router.push("/")} />}
        </>
      )}
    </div>
  );
}
