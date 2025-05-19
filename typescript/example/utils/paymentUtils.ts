// paymentUtils.ts
import { Network } from "@/types/payment";
import { PaymentRequirements } from "@bit-gpt/h402/types";

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
export function getCompatiblePaymentRequirements(
  paymentRequirements: PaymentRequirements[],
  networkId: string
): PaymentRequirements[] {
  if (!paymentRequirements.length) {
    return [];
  }

  // Filter methods by matching networkId
  const compatibleMethods = paymentRequirements.filter((requirement) => {
    if (networkId === "solana") {
      return requirement.namespace === "solana";
    } else if (networkId === "bsc") {
      return requirement.networkId === "56"; // BSC mainnet chain ID
    }
    return false;
  });
  return compatibleMethods;
}

/**
 * Generate network and coin options from payment requirements
 */
export function generateAvailableNetworks(
  paymentRequirements: PaymentRequirements[]
): Network[] {
  // Group payment methods by network
  const networkGroups: Record<string, PaymentRequirements[]> = {};

  paymentRequirements.forEach((requirement) => {
    const networkId = requirement.namespace || "";
    if (!networkGroups[networkId]) {
      networkGroups[networkId] = [];
    }
    networkGroups[networkId].push(requirement);
  });

  // Map to network structure
  const networks: Network[] = [];

  // Handle EVM networks
  if (networkGroups["evm"] && networkGroups["evm"].length > 0) {
    const evmCoins = networkGroups["evm"].map((requirement) => {
      // Determine coin type from token type and address
      const isNative = requirement.tokenType === "NATIVE";
      const tokenSymbol =
        requirement.tokenSymbol || (isNative ? "BNB" : "TOKEN");

      return {
        id: requirement.tokenAddress || "",
        name: tokenSymbol,
        icon: `/assets/coins/${tokenSymbol.toLowerCase()}.svg`,
        paymentMethod: requirement, // Store the original payment method for reference
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
    const solanaCoins = networkGroups["solana"].map((requirement) => {
      // Determine coin type from token type and address
      const isNative = requirement.tokenType === "NATIVE";
      const tokenSymbol =
        requirement.tokenSymbol || (isNative ? "SOL" : "USDC");

      return {
        id: requirement.tokenAddress || "",
        name: tokenSymbol,
        icon: `/assets/coins/${tokenSymbol.toLowerCase()}.svg`,
        paymentMethod: requirement, // Store the original payment method for reference
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
