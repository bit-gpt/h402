import { createPublicClient, http, type PublicActions } from "viem";
import { bsc } from "viem/chains";

// Chain configurations
export const CHAINS = {
  bsc,
  // Add more chains as needed
};

// Create clients for each chain
export const CLIENTS = Object.entries(CHAINS).reduce(
  (acc, [networkId, chain]) => ({
    ...acc,
    [networkId]: createPublicClient({
      chain,
      transport: http(),
    }),
  }),
  {} as { [key: string]: ReturnType<typeof createPublicClient> }
);

/**
 * Get a client for a specific network
 * If a client is provided, use that instead of creating a new one
 */
export function getClient(networkId: string, client?: PublicActions): PublicActions {
  if (client) {
    return client;
  }

  const defaultClient = CLIENTS[networkId];
  if (!defaultClient) {
    throw new Error(`Unsupported network: ${networkId}`);
  }

  return defaultClient;
}
