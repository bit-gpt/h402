import { address, getProgramDerivedAddress } from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

export async function getAssociatedTokenAddress(
  mint: string | ReturnType<typeof address>,
  owner: string | ReturnType<typeof address>
): Promise<ReturnType<typeof address>> {
  const mintAddress = typeof mint === "string" ? address(mint) : mint;
  const ownerAddress = typeof owner === "string" ? address(owner) : owner;

  const [associatedTokenAddress] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [ownerAddress, TOKEN_PROGRAM_ADDRESS, mintAddress],
  });

  return associatedTokenAddress;
}
