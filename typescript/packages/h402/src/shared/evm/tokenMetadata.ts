import { erc20Abi } from "viem";
import { getPublicClient } from "../../types/shared/evm";

/**
 * Get the number of decimals for a token
 * For native token, returns network-specific decimals (18 for most EVM chains)
 * For ERC20 tokens, fetches from the contract
 */
export async function getTokenDecimals(
  tokenAddress: string,
  networkId: string = "56"
): Promise<number> {
  // Special case for native token (0x0 address)
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return 18; // Standard for most EVM chains
  }

  try {
    const evmClient = getPublicClient(networkId);
    if (!evmClient) {
      throw new Error(`Unsupported network: ${networkId}`);
    }

    const decimals = await evmClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    });

    return Number(decimals);
  } catch (error) {
    console.error("Error fetching token decimals:", error);
    return 18; // Default to 18 decimals if fetch fails
  }
}

/**
 * Get the symbol for a token
 * For native token, returns network-specific symbol (BNB for BSC, ETH for Ethereum, etc)
 * For ERC20 tokens, fetches from the contract
 */
export async function getTokenSymbol(
  tokenAddress: string,
  networkId: string = "56"
): Promise<string | undefined> {
  // Special case for native token (0x0 address)
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    switch (networkId) {
      case "56":
        return "BNB";
      // Add more networks as needed
      default:
        return undefined;
    }
  }

  try {
    const evmClient = getPublicClient(networkId);
    if (!evmClient) {
      throw new Error(`Unsupported network: ${networkId}`);
    }

    const symbol = await evmClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "symbol",
    });

    return symbol;
  } catch (error) {
    console.error("Error fetching token symbol:", error);
    return undefined;
  }
}
