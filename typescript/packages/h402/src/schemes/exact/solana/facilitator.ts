import {
  address,
  Address,
  assertIsInstructionWithAccounts,
  assertIsInstructionWithData,
  Base64EncodedWireTransaction,
  CompilableTransactionMessage,
  createSolanaRpc,
  decompileTransactionMessage,
  fetchEncodedAccounts,
  getCompiledTransactionMessageDecoder,
  GetTransactionApi,
  IInstruction,
  IAccountLookupMeta,
  IAccountMeta,
  IInstructionWithData,
} from "@solana/kit";
import {
  parseSetComputeUnitLimitInstruction,
  parseSetComputeUnitPriceInstruction,
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
} from "@solana-program/compute-budget";
import {
  findAssociatedTokenPda,
  identifyToken2022Instruction,
  parseTransferCheckedInstruction as parseTransferCheckedInstruction2022,
  Token2022Instruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import {
  identifyTokenInstruction,
  parseTransferCheckedInstruction as parseTransferCheckedInstructionToken,
  TOKEN_PROGRAM_ADDRESS,
  TokenInstruction,
} from "@solana-program/token";
import {
  PaymentRequirements,
  SettleResponse,
  SolanaPaymentPayload,
  SolanaSignTransactionPayload,
  VerifyResponse,
} from "../../../types/index.js";
import { solana } from "../../../shared/index.js";
import { getFacilitator } from "../../../shared/next.js";
import { decodeTransactionFromPayload } from "../../../shared/solana/transaction.js";
import { convertAmountToSmallestUnit } from "../../../shared/solana/amount.js";

/**
 * Verify a Solana payment for the exact scheme
 * Checks that the transaction is confirmed and contains a transfer to the correct address
 * with the correct amount and a memo matching the resource
 */
export async function verify(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("VERIFY");
  if (paymentRequirements.namespace !== "solana") {
    return {
      isValid: false,
      errorMessage: 'Payment details must use the "solana" namespace',
      invalidReason: "invalid_payment_requirements",
    };
  }

  try {
    console.log("[DEBUG-SOLANA-VERIFY] Starting Solana payment verification", {
      payloadType: payload.payload.type,
      networkId: paymentRequirements.networkId,
      tokenAddress: paymentRequirements.tokenAddress,
      amountRequired: paymentRequirements.amountRequired,
    });

    switch (payload.payload.type) {
      case "signAndSendTransaction":
        // For signAndSendTransaction, verify both signature and transaction match
        if (!payload.payload.signature) {
          return {
            isValid: false,
            errorMessage:
              "Missing required signature in signAndSendTransaction payload",
            invalidReason: "invalid_exact_solana_payload_signature",
          };
        }

        // Fetch the transaction
        const txResponse = await solana.fetchTransaction(
          payload.payload.signature,
          { waitForConfirmation: true }
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
          paymentRequirements
        );

        if (!isValidPayment.isValid) {
          return isValidPayment;
        }

        return {
          isValid: true,
          txHash: payload.payload.signature,
          type: "transaction",
        };
      case "signTransaction":
        console.log("[DEBUG-SOLANA-VERIFY] Signing transaction");
        // For signTransaction, simulate to verify it will execute successfully
        const simulationResult = await simulateTransaction(
          payload,
          paymentRequirements
        );
        
        if (!simulationResult.isValid) {
          return simulationResult;
        }
        
        return {
          isValid: true,
          txHash: payload.payload.signature,
          type: "payload", // type payload will trigger settle function
        };
      case "signMessage":
        return {
          isValid: false,
          errorMessage:
            "SignMessage payloads cannot be verified as transactions",
        };
      default:
        return {
          isValid: false,
          errorMessage: `Unsupported payload type: ${
            (payload.payload as any).type
          }`,
        };
    }
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
  txResponse: ReturnType<GetTransactionApi["getTransaction"]>,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  if (!txResponse?.meta) {
    return {
      isValid: false,
      errorMessage: "Transaction metadata not available",
    };
  }

  const payToAddress = address(paymentRequirements.payToAddress);
  const requiredAmount = BigInt(paymentRequirements.amountRequired.toString());

  // Check if this is a native SOL transfer or SPL token transfer
  if (paymentRequirements.tokenAddress === "11111111111111111111111111111111") {
    // Native SOL transfer
    let totalTransferred = BigInt(0);

    // Check pre- / post-balances to find transfers to the recipient
    if (txResponse.meta.preBalances && txResponse.meta.postBalances) {
      const accountKeys = txResponse.transaction.message.accountKeys;

      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey =
          typeof accountKeys[i] === "string"
            ? address(accountKeys[i])
            : accountKeys[i];

        if (accountKey.toString() === payToAddress.toString()) {
          const preBalance = txResponse.meta.preBalances[i];
          const postBalance = txResponse.meta.postBalances[i];
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
    let totalTransferred = BigInt(0);

    // Check pre/post balances to find transfers to the recipient
    if (txResponse.meta.preTokenBalances && txResponse.meta.postTokenBalances) {
      // Match token balances by accountIndex
      for (const preTokenBalance of txResponse.meta.preTokenBalances) {
        // Find matching post balance
        const postTokenBalance = txResponse.meta.postTokenBalances.find(
          (post) => post.accountIndex === preTokenBalance.accountIndex
        );

        // Skip if we don't have both pre and post balances
        if (!postTokenBalance) continue;

        // Check if this is the recipient's token account
        if (preTokenBalance.owner === payToAddress.toString()) {
          const transferred =
            BigInt(postTokenBalance.uiTokenAmount.amount) -
            BigInt(preTokenBalance.uiTokenAmount.amount);

          if (transferred > 0) {
            totalTransferred += transferred;
            foundValidTransfer = true;
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

    if (!foundValidTransfer) {
      return {
        isValid: false,
        errorMessage: "No valid token transfer found in transaction",
      };
    }
  }

  return { isValid: true };
}

/**
 * Perform transaction introspection and simulation to verify transaction validity
 * This validates structure, recipient, amount, and execution feasibility
 */
async function simulateTransaction(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    if (payload.payload.type !== "signTransaction") {
      return {
        isValid: false,
        errorMessage: "Invalid payload type for validation",
        invalidReason: "invalid_payload",
      };
    }

    const signTransactionPayload = payload.payload as SolanaSignTransactionPayload;
    
    if (!signTransactionPayload.transaction) {
      return {
        isValid: false,
        errorMessage: "Missing transaction in signTransaction payload",
        invalidReason: "invalid_exact_solana_payload_signature",
      };
    }

    const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);

    const introspectionResult = await introspectTransaction(
      signTransactionPayload.transaction,
      paymentRequirements,
      rpc
    );
    
    if (!introspectionResult.isValid) {
      return introspectionResult;
    }

    const simulationResult = await rpc
      .simulateTransaction(
        signTransactionPayload.transaction as Base64EncodedWireTransaction,
        {
          encoding: "base64",
          commitment: "confirmed",
        }
      )
      .send();

    console.log("[DEBUG-SOLANA-SIMULATE] Simulation result:", simulationResult);

    if (simulationResult.value.err) {
      const errorMsg = JSON.stringify(simulationResult.value.err);
      console.log("[DEBUG-SOLANA-SIMULATE] Simulation failed:", errorMsg);
      
      return {
        isValid: false,
        errorMessage: `Transaction simulation failed: ${errorMsg}`,
        invalidReason: "insufficient_funds",
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("[DEBUG-SOLANA-VALIDATE] Error during validation:", error);
    return {
      isValid: false,
      errorMessage: `Error validating transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "unexpected_verify_error",
    };
  }
}

/**
 * Introspect transaction to validate structure and payment details
 * Ensures correct recipient, amount, and token before execution
 */
async function introspectTransaction(
  transactionBase64: string,
  paymentRequirements: PaymentRequirements,
  rpc: ReturnType<typeof createSolanaRpc>
): Promise<VerifyResponse> {
  try {
    // Decode the full signed transaction (includes signatures + message)
    const decodedTransaction = decodeTransactionFromPayload(transactionBase64);
    
    // Decode the compiled message, then decompile it to get instructions
    const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(
      decodedTransaction.messageBytes
    );
    const transactionMessage: CompilableTransactionMessage = decompileTransactionMessage(
      compiledTransactionMessage
    );

    console.log("[DEBUG-SOLANA-INTROSPECT] Transaction has", transactionMessage.instructions.length, "instructions");
    
    // Debug: Log instruction details
    transactionMessage.instructions.forEach((instruction, index) => {
      console.log(`[DEBUG-SOLANA-INTROSPECT] Instruction ${index}:`, {
        programAddress: instruction.programAddress,
        dataLength: instruction.data?.length,
        accountsCount: instruction.accounts?.length
      });
    });

    return await validateTransactionInstructions(transactionMessage, paymentRequirements, rpc);
  } catch (error) {
    console.error("[DEBUG-SOLANA-INTROSPECT] Error:", error);
    return {
      isValid: false,
      errorMessage: `Failed to decode transaction: ${error instanceof Error ? error.message : String(error)}`,
      invalidReason: "invalid_exact_solana_payload_signature",
    };
  }
}

/**
 * Validate that the transaction contains the expected instructions with correct details
 */
async function validateTransactionInstructions(
  transactionMessage: CompilableTransactionMessage,
  paymentRequirements: PaymentRequirements,
  rpc: ReturnType<typeof createSolanaRpc>
): Promise<VerifyResponse> {
  if (transactionMessage.instructions.length < 3 || transactionMessage.instructions.length > 4) {
    return {
      isValid: false,
      errorMessage: `Invalid instruction count: expected 3-4, got ${transactionMessage.instructions.length}`,
      invalidReason: "invalid_exact_solana_payload_signature",
    };
  }

  const computeLimitResult = validateComputeLimitInstruction(transactionMessage.instructions[0]);
  if (!computeLimitResult.isValid) return computeLimitResult;

  const computePriceResult = validateComputePriceInstruction(transactionMessage.instructions[1]);
  if (!computePriceResult.isValid) return computePriceResult;

  if (transactionMessage.instructions.length === 3) {
    return await validateTransferInstruction(
      transactionMessage.instructions[2],
      paymentRequirements,
      false,
      rpc
    );
  } else {
    return await validateTransferInstruction(
      transactionMessage.instructions[3],
      paymentRequirements,
      true,
      rpc
    );
  }
}

/**
 * Validate compute unit limit instruction
 */
function validateComputeLimitInstruction(
  instruction: IInstruction<string, readonly (IAccountLookupMeta<string, string> | IAccountMeta<string>)[]>
): VerifyResponse {
  try {
    if (instruction.programAddress.toString() !== COMPUTE_BUDGET_PROGRAM_ADDRESS.toString() ||
        !instruction.data || instruction.data[0] !== 2) {
      return {
        isValid: false,
        errorMessage: "Invalid compute limit instruction",
        invalidReason: "invalid_exact_solana_payload_signature",
      };
    }
    
    parseSetComputeUnitLimitInstruction(instruction as IInstructionWithData<Uint8Array<ArrayBufferLike>>);
    return { isValid: true };
  } catch (error) {
    console.error("[DEBUG-SOLANA-INTROSPECT] Compute limit validation error:", error);
    return {
      isValid: false,
      errorMessage: "Failed to parse compute limit instruction",
      invalidReason: "invalid_exact_solana_payload_signature",
    };
  }
}

/**
 * Validate compute unit price instruction (prevents gas abuse)
 */
function validateComputePriceInstruction(
  instruction: IInstruction<string, readonly (IAccountLookupMeta<string, string> | IAccountMeta<string>)[]>
): VerifyResponse {
  try {
    if (instruction.programAddress.toString() !== COMPUTE_BUDGET_PROGRAM_ADDRESS.toString() ||
        !instruction.data || instruction.data[0] !== 3) {
      return {
        isValid: false,
        errorMessage: "Invalid compute price instruction",
        invalidReason: "invalid_exact_solana_payload_signature",
      };
    }
    
    const parsedInstruction = parseSetComputeUnitPriceInstruction(
      instruction as IInstructionWithData<Uint8Array<ArrayBufferLike>>
    );
    
    if (parsedInstruction.data.microLamports > 5n * 1_000_000n) {
      return {
        isValid: false,
        errorMessage: "Compute unit price too high (max 5 lamports)",
        invalidReason: "invalid_exact_solana_payload_signature",
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error("[DEBUG-SOLANA-INTROSPECT] Compute price validation error:", error);
    return {
      isValid: false,
      errorMessage: "Failed to parse compute price instruction",
      invalidReason: "invalid_exact_solana_payload_signature",
    };
  }
}

/**
 * Validate transfer instruction - ensures correct recipient, amount, and token
 */
async function validateTransferInstruction(
  instruction: IInstruction<string, readonly (IAccountLookupMeta<string, string> | IAccountMeta<string>)[]>,
  paymentRequirements: PaymentRequirements,
  hasCreateATA: boolean,
  rpc: ReturnType<typeof createSolanaRpc>
): Promise<VerifyResponse> {
  try {
    assertIsInstructionWithData(instruction);
    assertIsInstructionWithAccounts(instruction);

    // Check if this is a native SOL transfer (System Program)
    const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;
    
    if (paymentRequirements.tokenAddress === "11111111111111111111111111111111") {
      // Native SOL transfer via System Program
      if (instruction.programAddress !== SYSTEM_PROGRAM_ADDRESS) {
        return {
          isValid: false,
          errorMessage: "Native SOL transfer must use System Program",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }

      // For System Program transfers, validate the instruction type and accounts
      // System Program Transfer instruction has discriminator 2
      const dataArray = new Uint8Array(instruction.data);
      if (dataArray[0] !== 2 && dataArray[1] !== 0 && dataArray[2] !== 0 && dataArray[3] !== 0) {
        return {
          isValid: false,
          errorMessage: "Not a System Program Transfer instruction",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }

      // Validate recipient (account index 1 should be the destination)
      if (instruction.accounts.length < 2) {
        return {
          isValid: false,
          errorMessage: "Invalid System Program Transfer instruction accounts",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }

      const destinationAccount = instruction.accounts[1];
      const expectedRecipient = address(paymentRequirements.payToAddress);
      
      if (destinationAccount.address !== expectedRecipient) {
        return {
          isValid: false,
          errorMessage: `Transfer to wrong address: expected ${expectedRecipient}, got ${destinationAccount.address}`,
          invalidReason: "invalid_exact_solana_payload_recipient_mismatch",
        };
      }

      // Validate amount (lamports stored as little-endian u64 starting at byte 4)
      const amountBuffer = dataArray.slice(4, 12);
      let transferAmount = 0n;
      for (let i = 0; i < 8; i++) {
        transferAmount += BigInt(amountBuffer[i]) << BigInt(8 * i);
      }

      const requiredAmount = convertAmountToSmallestUnit(
        paymentRequirements.amountRequired,
        paymentRequirements.tokenDecimals || 9,
        paymentRequirements.amountRequiredFormat
      );

      if (transferAmount !== requiredAmount) {
        return {
          isValid: false,
          errorMessage: `Amount mismatch: expected ${requiredAmount}, got ${transferAmount}`,
          invalidReason: "invalid_exact_solana_payload_authorization_value",
        };
      }

      console.log("[DEBUG-SOLANA-INTROSPECT] Native SOL transfer validation passed:", {
        recipient: expectedRecipient,
        amount: requiredAmount.toString(),
      });

      return { isValid: true };
    }

    // SPL Token transfer handling (existing code)
    let parsedTransfer;
    let tokenProgramAddress;

    if (instruction.programAddress === TOKEN_PROGRAM_ADDRESS) {
      const instructionType = identifyTokenInstruction(instruction);
      if (instructionType !== TokenInstruction.TransferChecked) {
        return {
          isValid: false,
          errorMessage: "Not a TransferChecked instruction",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }
      const dataArray = new Uint8Array(instruction.data);
      parsedTransfer = parseTransferCheckedInstructionToken({
        ...instruction,
        data: dataArray,
      });
      tokenProgramAddress = TOKEN_PROGRAM_ADDRESS;
    } else if (instruction.programAddress === TOKEN_2022_PROGRAM_ADDRESS) {
      const instructionType = identifyToken2022Instruction(instruction);
      if (instructionType !== Token2022Instruction.TransferChecked) {
        return {
          isValid: false,
          errorMessage: "Not a Token2022 TransferChecked instruction",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }
      const dataArray = new Uint8Array(instruction.data);
      parsedTransfer = parseTransferCheckedInstruction2022({
        ...instruction,
        data: dataArray,
      });
      tokenProgramAddress = TOKEN_2022_PROGRAM_ADDRESS;
    } else {
      return {
        isValid: false,
        errorMessage: "Invalid token program address",
        invalidReason: "invalid_exact_solana_payload_signature",
      };
    }

    const expectedRecipientATA = await findAssociatedTokenPda({
      mint: paymentRequirements.tokenAddress as Address,
      owner: paymentRequirements.payToAddress as Address,
      tokenProgram: tokenProgramAddress,
    });

    if (parsedTransfer.accounts.destination.address !== expectedRecipientATA[0]) {
      return {
        isValid: false,
        errorMessage: `Transfer to wrong address: expected ${expectedRecipientATA[0]}, got ${parsedTransfer.accounts.destination.address}`,
        invalidReason: "invalid_exact_solana_payload_recipient_mismatch",
      };
    }

    const requiredAmount = convertAmountToSmallestUnit(
      paymentRequirements.amountRequired,
      paymentRequirements.tokenDecimals || 9,
      paymentRequirements.amountRequiredFormat
    );

    if (parsedTransfer.data.amount !== requiredAmount) {
      return {
        isValid: false,
        errorMessage: `Amount mismatch: expected ${requiredAmount}, got ${parsedTransfer.data.amount}`,
        invalidReason: "invalid_exact_solana_payload_authorization_value",
      };
    }

    const addresses = [parsedTransfer.accounts.source.address, expectedRecipientATA[0]];
    const maybeAccounts = await fetchEncodedAccounts(rpc, addresses);
    const missingAccounts = maybeAccounts.filter(a => !a.exists);
    
    for (const missingAccount of missingAccounts) {
      if (missingAccount.address === parsedTransfer.accounts.source.address) {
        return {
          isValid: false,
          errorMessage: "Sender token account not found",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }
      if (missingAccount.address === expectedRecipientATA[0] && !hasCreateATA) {
        return {
          isValid: false,
          errorMessage: "Recipient token account not found",
          invalidReason: "invalid_exact_solana_payload_signature",
        };
      }
    }

    console.log("[DEBUG-SOLANA-INTROSPECT] Transfer validation passed:", {
      recipient: expectedRecipientATA[0],
      amount: requiredAmount.toString(),
      token: paymentRequirements.tokenAddress,
    });

    return { isValid: true };
  } catch (error) {
    console.error("[DEBUG-SOLANA-INTROSPECT] Transfer validation error:", error);
    return {
      isValid: false,
      errorMessage: `Failed to validate transfer: ${error instanceof Error ? error.message : String(error)}`,
      invalidReason: "invalid_exact_solana_payload_signature",
    };
  }
}

/**
 * Settle a Solana payment
 * For broadcast transactions, this just verifies the transaction is confirmed
 */
export async function settle(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  console.log("SETTLE");
  const valid = await verify(payload, paymentRequirements);

  if (!valid.isValid) {
    return {
      success: false,
      transaction: "",
      errorReason: valid.invalidReason ?? "invalid_scheme", //`Payment is no longer valid: ${valid.invalidReason}`,
      error: valid.errorMessage,
    };
  }

  if (payload.payload.type === "signAndSendTransaction") {
    return {
      success: false,
      transaction: "",
      error: "This payload type is not supported",
    };
  }

  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);
  const response = await rpc
    .sendTransaction(
      (payload.payload as SolanaSignTransactionPayload)
        .transaction as Base64EncodedWireTransaction,
      { encoding: "base64" }
    )
    .send();
  console.log("[DEBUG-SOLANA-SETTLE] txHash", response);
  if (response !== payload.payload.signature) {
    throw new Error("Something went wrong");
  }

  return {
    success: true,
    transaction: payload.payload.signature,
    namespace: paymentRequirements.namespace,
  };
}
