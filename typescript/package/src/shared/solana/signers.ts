import { Address, address } from "@solana/kit";
import { TransactionPartialSigner } from "@solana/signers";
import { SignatureDictionary } from "@solana/signers";
import { Transaction } from "@solana/transactions";

/**
 * Creates a TransactionSigner from an address string.
 * This is a utility function that creates a minimal implementation of the TransactionSigner interface
 * that can be used with the Solana program clients like getTransferSolInstruction.
 * 
 * Note: This signer cannot actually sign transactions as it doesn't have the private key.
 * It's only meant to be used for creating instructions that require a TransactionSigner parameter.
 * 
 * @param addressString - The address string to create a signer for
 * @returns A TransactionSigner object with the specified address
 */
export function createAddressSigner<TAddress extends string = string>(
  addressString: string
): TransactionPartialSigner<TAddress> {
  return {
    address: address(addressString) as Address<TAddress>,
    signTransactions: async (
      transactions: readonly Transaction[]
    ): Promise<readonly SignatureDictionary[]> => {
      // This is a dummy implementation that doesn't actually sign anything
      // It's only meant to be used for creating instructions
      return transactions.map(() => ({}));
    },
  };
}
