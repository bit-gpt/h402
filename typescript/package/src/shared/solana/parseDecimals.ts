import { createSolanaRpc, address } from '@solana/kit';
import { getClusterUrl } from './clusterEndpoints.js';
import { NATIVE_SOL_DECIMALS } from './index.js';

/**
 * Get the number of decimals for a token
 * For native SOL, returns 9
 * For SPL tokens, fetches the mint info
 */
export async function getTokenDecimals(
  tokenAddress: string,
  clusterId: string
): Promise<number> {
  // Special case for native SOL (empty string or special zero address)
  if (!tokenAddress || tokenAddress === '11111111111111111111111111111111') {
    return NATIVE_SOL_DECIMALS;
  }

  try {
    const rpc = createSolanaRpc(getClusterUrl(clusterId));
    const { value: mintInfo } = await rpc.getAccountInfo(address(tokenAddress)).send();

    if (!mintInfo || !mintInfo.data) {
      throw new Error(`Token account not found for ${tokenAddress}`);
    }

    // The decimals are stored at a specific offset in the mint account data
    // For SPL tokens, decimals are at offset 44 and are 1 byte long
    return Number(mintInfo.data[44]);
  } catch (error) {
    throw new Error(
      `Failed to get decimals for token ${tokenAddress}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
