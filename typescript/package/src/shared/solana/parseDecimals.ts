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

/**
 * Convert a formatted amount to atomic units
 * For example, 1.5 SOL -> 1500000000 lamports
 */
export function formatToAtomic(
  amount: number,
  decimals: number
): bigint {
  return BigInt(Math.floor(amount * 10 ** decimals));
}

/**
 * Convert atomic units to a formatted amount
 * For example, 1500000000 lamports -> 1.5 SOL
 */
export function atomicToFormatted(
  amount: bigint | number,
  decimals: number
): number {
  return Number(amount) / 10 ** decimals;
}
