import {address, createSolanaRpc} from "@solana/kit";
import {TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";
import {PaymentPayload, PaymentRequirements} from "../../../types/index.js";
import {Payload} from "../../../types/scheme/exact/solana/index.js";
import {SettleResponse, VerifyResponse} from "../../../types/facilitator.js";
import {solana} from "../../../shared/index.js";

/**
 * Verify a Solana payment for the exact scheme
 * Checks that the transaction is confirmed and contains a transfer to the correct address
 * with the correct amount and a memo matching the resource
 */
export async function verify(
  payload: PaymentPayload<Payload>,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  if (paymentRequirements.namespace !== "solana") {
    return {
      isValid: false,
      errorMessage: 'Payment details must use the "solana" namespace',
    };
  }

  try {
    console.log("[DEBUG-SOLANA-VERIFY] Starting Solana payment verification", {
      payloadType: payload.payload.type,
      networkId: paymentRequirements.networkId,
      resource: paymentRequirements.resource
    });

    // Create RPC client for Solana cluster
    const rpc = createSolanaRpc(
      solana.getClusterUrl(paymentRequirements.networkId)
    );

    // Get transaction signature based on payload type
    let txSignature: string;

    switch (payload.payload.type) {
      case "nativeTransfer":
      case "tokenTransfer":
        txSignature = payload.payload.signature;
        break;
      case "signAndSendTransaction":
        // For signAndSendTransaction, verify both signature and transaction match
        if (!payload.payload.signature || !payload.payload.transaction?.signature) {
          return {
            isValid: false,
            errorMessage: "Missing required signature in signAndSendTransaction payload"
          };
        }
        if (payload.payload.signature !== payload.payload.transaction.signature) {
          return {
            isValid: false,
            errorMessage: "Signature mismatch between payload and transaction"
          };
        }
        txSignature = payload.payload.signature;
        break;
      case "signTransaction":
        txSignature = payload.payload.signedTransaction;
        break;
      case "signMessage":
        return {
          isValid: false,
          errorMessage:
            "SignMessage payloads cannot be verified as transactions",
        };
      default:
        return {
          isValid: false,
          errorMessage: `Unsupported payload type: ${(payload.payload as any).type}`,
        };
    }

    console.log("[DEBUG-SOLANA-VERIFY] Fetching transaction", {txSignature});

    // Fetch the transaction
    const txResponse = await solana.fetchTransaction(
      txSignature,
      paymentRequirements.networkId,
      {waitForConfirmation: true},
    );

    if (!txResponse) {
      return {
        isValid: false,
        errorMessage: "Transaction not found",
      };
    }

    // Verify transaction is confirmed
    if (!txResponse.meta || txResponse.meta.err) {
      return {
        isValid: false,
        errorMessage: "Transaction failed or not confirmed",
      };
    }

    // Verify payment amount and recipient
    const isValidPayment = await verifyPaymentAmount(
      txResponse,
      paymentRequirements,
      rpc
    );

    if (!isValidPayment.isValid) {
      return isValidPayment;
    }

    // All checks passed
    return {
      isValid: true,
      txHash: txSignature,
      type: "transaction",
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error verifying transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Verify the payment amount and recipient in a transaction
 */
async function verifyPaymentAmount(
  txResponse: any, // Using any type to avoid compatibility issues
  paymentRequirements: PaymentRequirements,
  rpc: ReturnType<typeof createSolanaRpc>
): Promise<VerifyResponse> {
  const {transaction, meta} = txResponse;
  if (!meta) {
    return {
      isValid: false,
      errorMessage: "Transaction metadata not available",
    };
  }

  const payToAddress = address(paymentRequirements.payToAddress);
  const requiredAmount = BigInt(paymentRequirements.amountRequired.toString());

  // Check if this is a native SOL transfer or SPL token transfer
  if (
    !paymentRequirements.tokenAddress ||
    paymentRequirements.tokenAddress === "11111111111111111111111111111111"
  ) {
    // Native SOL transfer
    let totalTransferred = BigInt(0);

    // Check pre/post balances to find transfers to the recipient
    if (meta.preBalances && meta.postBalances) {
      const accountKeys = transaction.message.accountKeys;

      for (let i = 0; i < accountKeys.length; i++) {
        // Convert to PublicKey if it's not already one
        const accountKey =
          typeof accountKeys[i] === "string"
            ? address(accountKeys[i])
            : accountKeys[i];

        if (accountKey.toString() === payToAddress.toString()) {
          const preBalance = meta.preBalances[i];
          const postBalance = meta.postBalances[i];
          const transferred = BigInt(postBalance) - BigInt(preBalance);

          if (transferred > 0) {
            totalTransferred += transferred;
          }
        }
      }
    }

    if (totalTransferred < requiredAmount) {
      return {
        isValid: false,
        errorMessage: `Insufficient payment: required ${requiredAmount}, got ${totalTransferred}`,
      };
    }
  } else {
    // SPL token transfer
    let foundValidTransfer = false;

    // Look through token program instructions
    for (const ix of transaction.message.instructions) {
      // Handle different transaction formats
      const programId =
        ix.programIdIndex !== undefined
          ? transaction.message.accountKeys[ix.programIdIndex]
          : ix.programId;

      // Convert to PublicKey if it's a string
      const programPubkey =
        typeof programId === "string" ? address(programId) : programId;

      if (programPubkey.equals(TOKEN_PROGRAM_ADDRESS)) {
        // This is a token program instruction
        // We need to check if it's a transfer to the right account with the right amount

        try {
          // Parse the instruction data to check if it's a transfer instruction
          // Token Program instruction layout:
          // - 1 byte: instruction type (3 = transfer, 12 = transferChecked)
          // - Remaining bytes: instruction-specific data
          if (!ix.data) {
            continue;
          }

          const instructionType = ix.data[0];

          // Check if this is a transfer (3) or transferChecked (12) instruction
          const isTransfer = instructionType === 3;
          const isTransferChecked = instructionType === 12;

          if (isTransfer || isTransferChecked) {
            // Get the accounts involved in this instruction
            const accounts =
              ix.accounts ||
              ix.accountKeyIndexes?.map(
                (idx: number) => transaction.message.accountKeys[idx]
              );

            if (!accounts || accounts.length < 3) {
              continue; // Skip if we can't determine the accounts or not enough accounts
            }

            // For a transfer instruction:
            // accounts[0] = source account
            // accounts[1] = destination account
            // accounts[2] = owner (signer)

            // Get the destination account
            const destinationAccount =
              typeof accounts[1] === "string"
                ? address(accounts[1])
                : accounts[1];

            // For tokens, we need to check if the destination is the associated token account
            // for the payment address
            if (paymentRequirements.tokenAddress) {
              // Get the expected token account for the payment address
              const expectedTokenAccount = solana.getAssociatedTokenAddress(
                address(paymentRequirements.tokenAddress),
                address(paymentRequirements.payToAddress)
              );

              // Compare the public keys
              if (
                destinationAccount.toString() !==
                expectedTokenAccount.toString()
              ) {
                continue; // Not the right destination
              }

              // Parse the amount from the instruction data
              // For transfer: amount is at offset 1 (u64 = 8 bytes)
              // For transferChecked: amount is at offset 1 (u64 = 8 bytes), mint is after that
              let amount: bigint | undefined;
              if (ix.data.length >= 9) {
                // Make sure we have enough data
                // Read amount as little-endian u64
                amount = BigInt(
                  ix.data
                    .slice(1, 9)
                    .reduce(
                      (acc: bigint, byte: number, i: number) =>
                        acc + (BigInt(byte) << BigInt(8 * i)),
                      BigInt(0)
                    )
                );

                // If this is transferChecked, also verify the mint (token) is correct
                if (isTransferChecked && ix.data.length >= 41) {
                  // In transferChecked, after amount (8 bytes) and decimals (1 byte)
                  // comes the mint address (32 bytes)
                  // We skip the decimals byte at position 9
                  const mintAddressBytes = ix.data.slice(10, 42);
                  const mintAddress = address(
                    Buffer.from(mintAddressBytes).toString("hex")
                  );
                  const expectedMint = address(
                    paymentRequirements.tokenAddress
                  );

                  // Compare the addresses as strings
                  if (mintAddress.toString() !== expectedMint.toString()) {
                    continue; // Wrong token
                  }
                }

                // Check if the amount is sufficient
                if (amount && amount >= requiredAmount) {
                  // We found a valid transfer with the correct amount to the correct destination
                  foundValidTransfer = true;
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error("Error parsing token transfer:", error);
        }
      }
    }

    if (!foundValidTransfer) {
      return {
        isValid: false,
        errorMessage: "No valid token transfer found in transaction",
      };
    }
  }

  return {isValid: true};
}

/**
 * Settle a Solana payment
 * For broadcast transactions, this just verifies the transaction is confirmed
 */
export async function settle(
  payload: PaymentPayload<Payload>,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  // For broadcast transactions, settling is the same as verifying
  const verifyResult = await verify(payload, paymentRequirements);

  if (!verifyResult.isValid) {
    return {
      success: false,
      error: verifyResult.errorMessage,
    };
  }

  // Get transaction signature based on payload type
  let txSignature: string;

  switch (payload.payload.type) {
    case "nativeTransfer":
    case "tokenTransfer":
      txSignature = payload.payload.signature;
      break;
    case "signAndSendTransaction":
      txSignature = payload.payload.signature;
      break;
    case "signTransaction":
      txSignature = payload.payload.signedTransaction;
      break;
    case "signMessage":
      return {
        success: false,
        error: "SignMessage payloads cannot be settled as transactions",
      };
    default:
      return {
        success: false,
        error: `Unsupported payload type: ${(payload.payload as any).type}`,
      };
  }

  return {
    success: true,
    txHash: txSignature,
    chainId: paymentRequirements.networkId,
  };
}
