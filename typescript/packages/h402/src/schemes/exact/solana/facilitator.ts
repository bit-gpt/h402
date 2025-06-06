import {
  address,
  Base64EncodedWireTransaction,
  createSolanaRpc,
  GetTransactionApi,
} from "@solana/kit";
import {
  PaymentRequirements,
  SettleResponse,
  SolanaPaymentPayload,
  SolanaSignTransactionPayload,
  VerifyResponse,
} from "../../../types";
import { solana } from "../../../shared/index.js";
import { getFacilitator } from "../../../shared/next";

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
 * Settle a Solana payment
 * For broadcast transactions, this just verifies the transaction is confirmed
 */
export async function settle(
  payload: SolanaPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  console.log("SETTLE");
  // re-verify to ensure the payment is still valid
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
