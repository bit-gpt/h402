import {
  EvmNetworkToChainId,
  Network,
  isEVMNetwork,
} from "../types/shared/index.js";

/**
 * Converts a network name to its corresponding chain ID
 *
 * @param network - The network name to convert to a chain ID
 * @returns The chain ID for the specified network (number for EVM, string for Solana)
 * @throws Error if the network is not supported
 */
export function getNetworkId(network: Network): number | string {
  if (isEVMNetwork(network) && EvmNetworkToChainId.has(network)) {
    return EvmNetworkToChainId.get(network)!;
  }
  if (network === "solana") {
    return "mainnet"; // Solana mainnet identifier
  }
  throw new Error(`Unsupported network: ${network}`);
}
