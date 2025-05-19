// paymentUtils.ts
import { Network } from "@/types/payment";
import {PaymentRequirements} from "@bit-gpt/h402/types";

/**
 * Converts payment details to array if needed
 */
export function normalizePaymentMethods(
  paymentRequirements: PaymentRequirements[] | PaymentRequirements | undefined
): PaymentRequirements[] {
  if (!paymentRequirements) return [];

  return Array.isArray(paymentRequirements)
    ? paymentRequirements
    : [paymentRequirements];
}

/**
 * Get compatible payment methods for the selected network
 */
export function getCompatiblePaymentMethods(
  paymentMethods: PaymentRequirements[],
  networkId: string
): PaymentRequirements[] {
  if (!paymentMethods.length) {
    console.log("[DEBUG-PAYMENT-FLOW] No payment methods available");
    return [];
  }

  if (networkId === "solana") {
    // Only return payment methods with Solana namespace
    const solanaMethods = paymentMethods.filter(
      (method) => method.namespace === "solana"
    );
    console.log(
      "[DEBUG-PAYMENT-FLOW] Filtered Solana payment methods:",
      JSON.stringify(solanaMethods, null, 2)
    );
    return solanaMethods;
  } else if (networkId === "bsc") {
    // Only return payment methods with EVM namespace
    const evmMethods = paymentMethods.filter(
      (method) => method.namespace === "evm"
    );
    console.log(
      "[DEBUG-PAYMENT-FLOW] Filtered EVM payment methods:",
      JSON.stringify(evmMethods, null, 2)
    );
    return evmMethods;
  }
  return [];
}

/**
 * Generate network and coin options from payment requirements
 */
export function generateAvailableNetworks(
  paymentRequirements: PaymentRequirements[]
): Network[] {
  // Group payment methods by network
  const networkGroups: Record<string, PaymentRequirements[]> = {};

  paymentRequirements.forEach((method) => {
    const networkId = method.namespace || "";
    if (!networkGroups[networkId]) {
      networkGroups[networkId] = [];
    }
    networkGroups[networkId].push(method);
  });

  // Map to network structure
  const networks: Network[] = [];

  // Handle EVM networks
  if (networkGroups["evm"] && networkGroups["evm"].length > 0) {
    const evmCoins = networkGroups["evm"].map((method) => {
      // Determine coin type from token type and address
      const isNative = method.tokenType === "NATIVE";
      const tokenSymbol = method.tokenSymbol || (isNative ? "BNB" : "TOKEN");

      return {
        id: method.tokenAddress || "",
        name: tokenSymbol,
        icon: `/assets/coins/${tokenSymbol.toLowerCase()}.svg`,
        paymentMethod: method, // Store the original payment method for reference
      };
    });

    networks.push({
      id: "bsc",
      name: "Binance Smart Chain",
      icon: "/assets/networks/bsc.svg",
      coins: evmCoins,
    });
  }

  // Handle Solana networks
  if (networkGroups["solana"] && networkGroups["solana"].length > 0) {
    const solanaCoins = networkGroups["solana"].map((method) => {
      // Determine coin type from token type and address
      const isNative = method.tokenType === "NATIVE";
      const tokenSymbol = method.tokenSymbol || (isNative ? "SOL" : "USDC");

      return {
        id: method.tokenAddress || "",
        name: tokenSymbol,
        icon: `/assets/coins/${tokenSymbol.toLowerCase()}.svg`,
        paymentMethod: method, // Store the original payment method for reference
      };
    });

    networks.push({
      id: "solana",
      name: "Solana",
      icon: "/assets/networks/solana.svg",
      coins: solanaCoins,
    });
  }

  return networks;
}
