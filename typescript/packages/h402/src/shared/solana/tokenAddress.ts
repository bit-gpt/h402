import { address, getProgramDerivedAddress } from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import bs58 from "bs58";

/**
 * Get the associated token address for a given mint and owner
 * This function derives the ATA using the standard Solana approach
 */
export async function getAssociatedTokenAddress(
  mint: ReturnType<typeof address>,
  owner: ReturnType<typeof address>
): Promise<ReturnType<typeof address>> {
  try {
    // Convert the address objects to strings
    const mintStr = mint.toString();
    const ownerStr = owner.toString();
    const tokenProgramStr = TOKEN_PROGRAM_ADDRESS.toString();

    // Decode from base58 to get the raw bytes
    const mintBytes = bs58.decode(mintStr);
    const ownerBytes = bs58.decode(ownerStr);
    const tokenProgramBytes = bs58.decode(tokenProgramStr);

    // Use the raw bytes as seeds for PDA derivation
    const [associatedTokenAddress] = await getProgramDerivedAddress({
      programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      seeds: [ownerBytes, tokenProgramBytes, mintBytes],
    });

    return associatedTokenAddress;
  } catch (error) {
    console.error("Error deriving Associated Token Address:", error);
    throw error;
  }
}
