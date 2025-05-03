/**
 * Solana cluster RPC endpoints configuration
 */

export type ClusterName = "mainnet";

export type ClusterConfig = {
  /** RPC URL for this cluster */
  url: string;
  /** WebSocket URL for this cluster (if different from HTTP) */
  wsUrl?: string;
};

// For the default immutable clusters
export type ReadonlyClusterRegistry = {
  readonly [clusterId: string]: ClusterConfig;
};

// For the mutable cluster configuration
export type ClusterRegistry = {
  [clusterId: string]: ClusterConfig;
};

// Default fallback if a cluster ID isn't found
export const FALLBACK_CLUSTER_ID = "mainnet";

// Default fallback URLs
const DEFAULT_MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_MAINNET_WS_URL = "wss://api.mainnet-beta.solana.com";

/**
 * Default registry of Solana clusters with their RPC endpoints
 */
export const DEFAULT_CLUSTERS: ReadonlyClusterRegistry = {
  mainnet: {
    url: DEFAULT_MAINNET_RPC_URL,
    wsUrl: DEFAULT_MAINNET_WS_URL,
  },
} as const;

// Global key for storing cluster configuration to avoid duplicate module instances
const GLOBAL_CLUSTER_KEY = "__h402_solana_cluster_config__" as const;

// Helper to get (and initialize) the global cluster registry
// This is a bit of a hack to ensure we always use the same registry between edge and server runtimes
function getGlobalClusterRegistry(): ClusterRegistry {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_CLUSTER_KEY]) {
    // First access: initialise with defaults
    g[GLOBAL_CLUSTER_KEY] = { ...DEFAULT_CLUSTERS } as ClusterRegistry;
  }
  return g[GLOBAL_CLUSTER_KEY] as ClusterRegistry;
}

// The actual clusters configuration that can be overridden
let clusterConfig: ClusterRegistry = getGlobalClusterRegistry();

/**
 * Configure Solana cluster endpoints
 * @param config Custom cluster configuration
 */
export function configureSolanaClusters(
  config: Partial<Record<string, ClusterConfig>>
) {
  // Always operate on the single shared instance
  clusterConfig = getGlobalClusterRegistry();

  // Reset to defaults first
  Object.assign(clusterConfig, DEFAULT_CLUSTERS);

  // Add each provided cluster config
  Object.entries(config).forEach(([clusterId, clusterCfg]) => {
    if (clusterCfg) {
      clusterConfig[clusterId] = clusterCfg;
    }
  });
}

/**
 * Get the RPC URL for a given cluster ID
 * Falls back to default URL if not configured
 */
export function getClusterUrl(clusterId: string): string {
  // Ensure we reference the shared registry
  clusterConfig = getGlobalClusterRegistry();
  if (!clusterConfig[clusterId]) {
    clusterId = FALLBACK_CLUSTER_ID;
  }
  return clusterConfig[clusterId].url;
}

/**
 * Check if a cluster ID is supported
 */
export function isSolanaSupported(clusterId: string): boolean {
  // Ensure we reference the shared registry
  clusterConfig = getGlobalClusterRegistry();
  return clusterId in clusterConfig;
}

// ---------------------------------------------
// Auto-configure from env vars (server only)
// Server and edge runtimes keep using your QuickNode endpoint.
// Client bundles fall back to the public default URL (or call the new /api/solana-rpc proxy
// ---------------------------------------------
if (
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process.env.SOLANA_MAINNET_RPC_URL
) {
  configureSolanaClusters({
    mainnet: {
      url: process.env.SOLANA_MAINNET_RPC_URL as string,
      wsUrl: process.env.SOLANA_MAINNET_WS_URL,
    },
  });
}
