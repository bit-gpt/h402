import { createSolanaRpc, address } from "@solana/kit";
import type { AccountInfoWithJsonData } from "@solana/kit";
import { getClusterUrl } from "./clusterEndpoints.js";
import { NATIVE_SOL_DECIMALS } from "./index.js";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

// TODO: Install @solana-program/token-metadata package
const TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

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
  if (!tokenAddress || tokenAddress === "11111111111111111111111111111111") {
    return NATIVE_SOL_DECIMALS;
  }

  try {
    const rpc = createSolanaRpc(getClusterUrl(clusterId));
    const { value: mintInfo } = await rpc
      .getAccountInfo(address(tokenAddress), {
        encoding: "jsonParsed",
      })
      .send();

    if (!mintInfo || !mintInfo.data) {
      throw new Error(`Token account not found for ${tokenAddress}`);
    }

    const parsedData = mintInfo.data as AccountInfoWithJsonData["data"];
    if (!("parsed" in parsedData) || parsedData.parsed.type !== "mint") {
      throw new Error(`Account ${tokenAddress} is not a mint`);
    }

    return (parsedData.parsed.info as any).decimals;
  } catch (error) {
    throw new Error(
      `Failed to get decimals for token ${tokenAddress}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get the symbol for a token
 * For native SOL, returns "SOL"
 * For SPL tokens, attempts to fetch from token metadata program
 */
async function findMetadataAddress(mint: string): Promise<string> {
  // For Token 2022, metadata is stored in the mint account
  // For regular SPL tokens, metadata is stored in a PDA account
  const seeds = [
    Buffer.from("metadata"),
    Buffer.from(TOKEN_METADATA_PROGRAM_ID, "hex"),
    Buffer.from(mint, "hex"),
  ];

  // This is a simplified PDA derivation - in production you'd want to use proper PDA derivation
  return seeds.join("");
}

export async function getTokenSymbol(
  tokenAddress: string,
  clusterId: string
): Promise<string | undefined> {
  // Special case for native SOL
  if (tokenAddress === "11111111111111111111111111111111") {
    return "SOL";
  }

  try {
    const rpc = createSolanaRpc(getClusterUrl(clusterId));

    // First verify it's a mint account
    const { value: mintInfo } = await rpc
      .getAccountInfo(address(tokenAddress), {
        encoding: "jsonParsed",
      })
      .send();

    if (!mintInfo || !mintInfo.data) {
      throw new Error(`Token account not found for ${tokenAddress}`);
    }

    const parsedData = mintInfo.data as AccountInfoWithJsonData["data"];
    if (!("parsed" in parsedData) || parsedData.parsed.type !== "mint") {
      throw new Error(`Account ${tokenAddress} is not a mint`);
    }

    // Check if this is a Token 2022 or regular SPL token
    const isToken2022 = mintInfo.owner === TOKEN_2022_PROGRAM_ADDRESS;
    const isRegularToken = mintInfo.owner === TOKEN_PROGRAM_ADDRESS;

    if (!isToken2022 && !isRegularToken) {
      throw new Error(
        `Account ${tokenAddress} is not owned by a token program`
      );
    }

    if (isToken2022) {
      // For Token 2022, metadata is stored in the mint account's extension data
      const parsedData = mintInfo.data as AccountInfoWithJsonData["data"];
      if (!("parsed" in parsedData) || !parsedData.parsed.info) {
        return undefined;
      }

      // Extract symbol from Token 2022 metadata extension
      return (parsedData.parsed.info as any).symbol || undefined;
    } else {
      // For regular SPL tokens, try the metadata program
      const metadataAddress = await findMetadataAddress(tokenAddress);
      const { value: metadataInfo } = await rpc
        .getAccountInfo(address(metadataAddress), {
          encoding: "jsonParsed",
        })
        .send();

      if (!metadataInfo || !metadataInfo.data) {
        return undefined; // No metadata account found
      }

      const metadataData = metadataInfo.data as AccountInfoWithJsonData["data"];
      if (!("parsed" in metadataData) || !metadataData.parsed.info) {
        return undefined;
      }

      return (metadataData.parsed.info as any).symbol || undefined;
    }
  } catch (error) {
    console.warn(
      `Failed to get symbol for token ${tokenAddress}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}
