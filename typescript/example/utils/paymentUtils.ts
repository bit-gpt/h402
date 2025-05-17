// paymentUtils.ts
import { PaymentMethod, Network, Coin } from "@/types/payment";
import { formatAmountForDisplay } from "@/utils/amountFormatting";

/**
 * Converts payment details to array if needed
 */
export function normalizePaymentMethods(
  paymentRequirements: PaymentMethod[] | PaymentMethod | undefined
): PaymentMethod[] {
  if (!paymentRequirements) return [];

  return Array.isArray(paymentRequirements)
    ? paymentRequirements
    : [paymentRequirements];
}

/**
 * Get compatible payment methods for the selected network
 */
export function getCompatiblePaymentMethods(
  paymentMethods: PaymentMethod[],
  networkId: string
): PaymentMethod[] {
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

  console.log(
    "[DEBUG-PAYMENT-FLOW] No compatible payment methods found for network:",
    networkId
  );
  return [];
}

/**
 * Format display amount from payment details
 */
export function getDisplayAmount(
  activePaymentRequirements: PaymentMethod | null,
  selectedCoin: Coin
): string {
  if (!activePaymentRequirements) return "0.01 SOL"; // Default fallback

  const { namespace, amountRequired, amountRequiredFormat } =
    activePaymentRequirements;

  // Make sure we have valid values for the formatAmountForDisplay function
  const amount = amountRequired || 0;
  const format = amountRequiredFormat || "smallestUnit";

  // Convert bigint to string if needed
  const safeAmount = typeof amount === "bigint" ? amount.toString() : amount;

  // Get the selected coin symbol
  const coinSymbol =
    selectedCoin?.name || (namespace === "solana" ? "SOL" : "USDT");

  if (namespace === "solana" || namespace === "evm") {
    return formatAmountForDisplay(
      safeAmount,
      namespace,
      format as "smallestUnit" | "humanReadable",
      coinSymbol
    );
  } else {
    // Fallback for unknown namespace
    return `${Number(safeAmount).toFixed(2)} ${coinSymbol}`;
  }
}

/**
 * Generate network and coin options from payment requirements
 */
export function generateAvailableNetworks(
  paymentMethods: PaymentMethod[]
): Network[] {
  // Group payment methods by network
  const networkGroups: Record<string, PaymentMethod[]> = {};

  paymentMethods.forEach((method) => {
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
