import { address, createSolanaRpc, GetTransactionApi } from "@solana/kit";
import {PaymentRequirements, SolanaPaymentPayload} from "../../../types";
import { SettleResponse, VerifyResponse } from "../../../types";
import { solana } from "../../../shared/index.js";

/**
 * Verify a Solana payment for the exact scheme
 * Checks that the transaction is confirmed and contains a transfer to the correct address
 * with the correct amount and a memo matching the resource
 */
export async function verify(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  if (paymentRequirements.namespace !== "solana") {
    return {
      isValid: false,
      errorMessage: 'Payment details must use the "solana" namespace',
      invalidReason: 'invalid_payment_requirements',
    };
  }

  try {
    console.log("[DEBUG-SOLANA-VERIFY] Starting Solana payment verification", {
      payloadType: payload.payload.type,
      networkId: paymentRequirements.networkId,
      resource: paymentRequirements.resource,
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
        if (
          !payload.payload.signature ||
          !payload.payload.transaction?.signature
        ) {
          return {
            isValid: false,
            errorMessage:
              "Missing required signature in signAndSendTransaction payload",
            invalidReason: 'invalid_exact_solana_payload_signature',
          };
        }
        if (
          payload.payload.signature !== payload.payload.transaction.signature
        ) {
          return {
            isValid: false,
            errorMessage: "Signature mismatch between payload and transaction",
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
          errorMessage: `Unsupported payload type: ${
            (payload.payload as any).type
          }`,
        };
    }

    console.log("[DEBUG-SOLANA-VERIFY] Fetching transaction", { txSignature });

    // Fetch the transaction
    const txResponse = await solana.fetchTransaction(
      txSignature,
      paymentRequirements.networkId,
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
 * Settle a Solana payment
 * For broadcast transactions, this just verifies the transaction is confirmed
 */
export async function settle(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  // For broadcast transactions, settling is the same as verifying
  const verifyResult = await verify(payload, paymentRequirements);

  if (!verifyResult.isValid) {
    return {
      success: false,
      transaction: verifyResult.txHash!,
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
        transaction: verifyResult.txHash!,
        error: "SignMessage payloads cannot be settled as transactions",
      };
    default:
      return {
        success: false,
        transaction: verifyResult.txHash!,
        error: `Unsupported payload type: ${(payload.payload as any).type}`,
      };
  }

  return {
    success: true,
    transaction: txSignature,
    namespace: paymentRequirements.namespace,
  };
}
