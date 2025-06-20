import {
  Network,
  PaymentRequirements,
  EvmNetworkToChainId,
  isEVMNetwork,
  isStablecoinAddress,
  isStablecoinSymbol,
} from "../types/index.js";

/**
 * Default selector for payment requirements.
 * Default behavior is to select the first payment requirement that has a stablecoin (USDT/USDC).
 * If no stablecoin payment requirement is found, the first payment requirement is selected.
 *
 * @param paymentRequirements - The payment requirements to select from.
 * @param namespace - The namespace to check against ("evm" or "solana"). If not provided, any namespace is accepted.
 * @param network - The network to check against. If not provided, the network will not be checked.
 * @param scheme - The scheme to check against. If not provided, the scheme will not be checked.
 * @returns The payment requirement that is the most appropriate for the user.
 */
export function selectPaymentRequirements(
  paymentRequirements: PaymentRequirements[],
  namespace?: "evm" | "solana",
  network?: Network,
  scheme?: "exact"
): PaymentRequirements {
  // Sort stablecoin payment requirements to the front of the list
  paymentRequirements.sort((a, b) => {
    const aIsStablecoin = isStablecoin(a);
    const bIsStablecoin = isStablecoin(b);

    if (aIsStablecoin && !bIsStablecoin) {
      return -1;
    }
    if (!aIsStablecoin && bIsStablecoin) {
      return 1;
    }
    return 0;
  });

  // Filter down to the namespace/network/scheme if provided
  const filteredPaymentRequirements = paymentRequirements.filter(
    (requirement) => {
      // Filter by namespace if provided
      const isExpectedNamespace =
        !namespace || requirement.namespace === namespace;

      // Filter by scheme if provided
      const isExpectedScheme = !scheme || requirement.scheme === scheme;

      // Filter by network if provided
      let isExpectedNetwork = true;
      if (network) {
        if (network === "solana") {
          isExpectedNetwork = requirement.namespace === "solana";
        } else {
          // For EVM networks, check if it matches the expected network
          isExpectedNetwork =
            requirement.namespace === "evm" &&
            getNetworkIdForNetwork(network) === requirement.networkId;
        }
      }

      return isExpectedNamespace && isExpectedScheme && isExpectedNetwork;
    }
  );

  // Return the first filtered requirement (stablecoins are already prioritized)
  if (filteredPaymentRequirements.length > 0) {
    return filteredPaymentRequirements[0];
  }

  // If no matching requirements are found, return the first requirement
  return paymentRequirements[0];
}

/**
 * Check if a payment requirement uses a stablecoin (USDT/USDC)
 */
function isStablecoin(requirement: PaymentRequirements): boolean {
  // Check by token symbol
  if (requirement.tokenSymbol && isStablecoinSymbol(requirement.tokenSymbol)) {
    return true;
  }

  // Check by known stablecoin addresses
  return isStablecoinAddress(requirement.tokenAddress);
}

/**
 * Helper function to get network ID for a given network name
 */
function getNetworkIdForNetwork(network: Network): string {
  if (network === "solana") {
    return "mainnet"; // Solana uses "mainnet" as networkId
  }

  if (isEVMNetwork(network)) {
    const chainId = EvmNetworkToChainId.get(network);
    return chainId ? chainId.toString() : "";
  }

  return "";
}

/**
 * Selector for payment requirements.
 *
 * @param paymentRequirements - The payment requirements to select from.
 * @param namespace - The namespace to check against ("evm" or "solana"). If not provided, any namespace is accepted.
 * @param network - The network to check against. If not provided, the network will not be checked.
 * @param scheme - The scheme to check against. If not provided, the scheme will not be checked.
 * @returns The payment requirement that is the most appropriate for the user.
 */
export type PaymentRequirementsSelector = (
  paymentRequirements: PaymentRequirements[],
  namespace?: "evm" | "solana",
  network?: Network,
  scheme?: "exact"
) => PaymentRequirements;
