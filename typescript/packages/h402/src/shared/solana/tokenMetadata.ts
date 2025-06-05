import {
  createSolanaRpc,
  address,
  getProgramDerivedAddress,
} from "@solana/kit";
import type { AccountInfoWithJsonData } from "@solana/kit";
import { NATIVE_SOL_DECIMALS } from "./index.js";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import {getFacilitator} from "../next";

/**
 * Convert a hex string to Uint8Array
 * Browser-compatible replacement for Buffer.from(hex, 'hex')
 */
function hexToUint8Array(hexString: string): Uint8Array {
  // Remove '0x' prefix if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  // Ensure even length
  const len = hex.length;
  if (len % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${len}`);
  }

  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i/2] = parseInt(hex.substring(i, i + 2), 16);
  }

  return bytes;
}

// Metadata program ID and address
const TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const TOKEN_METADATA_PROGRAM_ADDRESS = address(TOKEN_METADATA_PROGRAM_ID);

// Well-known token addresses and their symbols
const WELL_KNOWN_TOKENS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC", // USDC (Circle)
};

/**
 * Get the number of decimals for a token
 * For native SOL, returns 9
 * For SPL tokens, fetches the mint info
 */
export async function getTokenDecimals(
  tokenAddress: string,
): Promise<number> {
  // Special case for native SOL (empty string or special zero address)
  if (!tokenAddress || tokenAddress === "11111111111111111111111111111111") {
    return NATIVE_SOL_DECIMALS;
  }

  try {
    const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);
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
  // Derive the metadata account address using Metaplex's Token Metadata Program
  const [metadataAddress] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      // Use TextEncoder for string to bytes conversion instead of Buffer
      new TextEncoder().encode("metadata"),
      // For hex strings, convert to Uint8Array manually
      hexToUint8Array(TOKEN_METADATA_PROGRAM_ID),
      hexToUint8Array(mint),
    ],
  });

  return metadataAddress.toString();
}

export async function getTokenSymbol(
  tokenAddress: string,
): Promise<string | undefined> {
  // Special case for native SOL
  if (tokenAddress === "11111111111111111111111111111111") {
    return "SOL";
  }

  try {
    const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);

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
    console.log(
      `[getTokenSymbol] Token type - Token2022: ${isToken2022}, Regular SPL: ${isRegularToken}`
    );

    if (!isToken2022 && !isRegularToken) {
      throw new Error(
        `Account ${tokenAddress} is not owned by a token program`
      );
    }

    if (isToken2022) {
      console.log("[getTokenSymbol] Processing Token 2022 metadata");
      // For Token 2022, metadata is stored in the mint account's extension data
      const parsedData = mintInfo.data as AccountInfoWithJsonData["data"];
      if (!("parsed" in parsedData) || !parsedData.parsed.info) {
        console.log(
          "[getTokenSymbol] No parsed data found in Token 2022 mint account"
        );
        return undefined;
      }

      // Extract symbol from Token 2022 metadata extension
      const symbol = (parsedData.parsed.info as any).symbol;
      console.log(`[getTokenSymbol] Token 2022 symbol found: ${symbol}`);
      return symbol || undefined;
    } else {
      console.log("[getTokenSymbol] Processing regular SPL token metadata");
      // For regular SPL tokens, try the metadata program
      const metadataAddress = await findMetadataAddress(tokenAddress);
      console.log(
        `[getTokenSymbol] Derived metadata address: ${metadataAddress}`
      );

      const { value: metadataInfo } = await rpc
        .getAccountInfo(address(metadataAddress), {
          encoding: "jsonParsed",
        })
        .send();

      if (!metadataInfo || !metadataInfo.data) {
        console.log(
          "[getTokenSymbol] No metadata account found at derived address"
        );
        return undefined; // No metadata account found
      }
      console.log("[getTokenSymbol] Metadata account found:", metadataInfo);

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

    // If on-chain metadata retrieval fails, fallback to hard-coded values
    if (WELL_KNOWN_TOKENS[tokenAddress]) {
      console.log(
        `[getTokenSymbol] Using hardcoded symbol for ${tokenAddress}: ${WELL_KNOWN_TOKENS[tokenAddress]}`
      );
      return WELL_KNOWN_TOKENS[tokenAddress];
    }
    return undefined;
  }
}
