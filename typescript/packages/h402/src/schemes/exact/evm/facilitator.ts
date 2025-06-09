import { evm } from "../../../shared/index.js";
import { SCHEME } from "../index.js";
import {
  VerifyResponse,
  SettleResponse,
  PaymentRequirements,
  EvmPaymentPayload,
  EvmAuthorizationPayload,
  EvmSignAndSendTransactionPayload,
  EvmSignedTransactionPayload,
  Namespace,
} from "../../../types";
import {
  encodeFunctionData,
  WalletClient,
  PublicActions,
  PublicClient,
  Hex,
  parseTransaction,
} from "viem";
import { h402Version } from "../../../index.js";
import {
  validateTransferData,
  validateTransferEventLog
} from "./validation.js";

const BLOCK_TIME = 2; // Average block time in seconds
const SAFETY_BLOCKS = 3; // Number of blocks for safety margin
const GAS_LIMIT_SAFETY_FACTOR = 1.25; // Allow 25% more than estimated gas

async function getMaxGasForChain(client: PublicClient): Promise<bigint> {
  try {
    const block = await client.getBlock();

    return BigInt(
      Math.floor(Number(block.gasLimit) * 0.3 * GAS_LIMIT_SAFETY_FACTOR)
    );
  } catch (error) {
    const baseFee = await client.getGasPrice();

    return baseFee * BigInt(Math.floor(100000 * GAS_LIMIT_SAFETY_FACTOR));
  }
}

async function verify(
  client: PublicClient,
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    if (!validateBasePayload(payload, paymentRequirements)) {
      return {
        isValid: false,
        errorMessage: "Invalid payload structure or version mismatch",
      };
    }

    if (!validateChain(payload, paymentRequirements)) {
      return {
        isValid: false,
        errorMessage: "Invalid chain configuration",
      };
    }

    switch (payload.payload.type) {
      case "authorization":
        return await verifyAuthorizationPayload(
          client,
          payload.payload,
          paymentRequirements
        );
      case "signAndSendTransaction":
        return await verifySignAndSendTransactionPayload(
          client,
          payload.payload,
          paymentRequirements
        );
      case "signedTransaction":
        return await verifySignedTransactionPayload(
          payload.payload,
          paymentRequirements
        );
      default:
        return {
          isValid: false,
          errorMessage: "Unsupported payload type",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateBasePayload(
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements
): boolean {
  return (
    payload.h402Version === h402Version &&
    payload.scheme === SCHEME &&
    payload.namespace === paymentRequirements.namespace &&
    payload.networkId === paymentRequirements.networkId &&
    payload.resource === paymentRequirements.resource
  );
}

function validateChain(
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements
): boolean {
  return (
    payload.networkId === paymentRequirements.networkId &&
    payload.namespace === "evm"
  );
}

async function verifyAuthorizationPayload(
  client: PublicClient,
  payload: EvmAuthorizationPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  const currentTime = Math.floor(Date.now() / 1000);
  const safetyMargin = BLOCK_TIME * SAFETY_BLOCKS;

  if (payload.authorization.validBefore < BigInt(currentTime + safetyMargin)) {
    return {
      isValid: false,
      errorMessage: "Authorization deadline too close to current time",
    };
  }

  if (payload.authorization.validAfter > BigInt(currentTime)) {
    return {
      isValid: false,
      errorMessage: "Authorization not yet valid",
    };
  }

  if (payload.authorization.value < paymentRequirements.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient authorized amount",
    };
  }

  if (payload.authorization.to !== paymentRequirements.payToAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  const balance = await client.readContract({
    address: paymentRequirements.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [payload.authorization.from as Hex],
  });

  if (balance < payload.authorization.value) {
    return {
      isValid: false,
      errorMessage: "Insufficient token balance",
    };
  }

  try {
    const data = encodeFunctionData({
      abi: [
        {
          name: "transferWithAuthorization",
          type: "function",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "signature", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ],
      functionName: "transferWithAuthorization",
      args: [
        payload.authorization.from as Hex,
        payload.authorization.to as Hex,
        payload.authorization.value,
        payload.authorization.validAfter,
        payload.authorization.validBefore,
        payload.authorization.nonce as Hex,
        payload.signature as Hex,
      ],
    });

    const gasEstimate = await client.estimateGas({
      account: payload.authorization.from as Hex,
      to: paymentRequirements.tokenAddress as Hex,
      data,
    });

    const maxGasAmount = await getMaxGasForChain(client);

    if (gasEstimate > maxGasAmount) {
      return {
        isValid: false,
        errorMessage: `Transaction would require too much gas (${gasEstimate} > ${maxGasAmount})`,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage:
        "Failed to estimate gas: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }

  const isValidSignature = await client.readContract({
    address: paymentRequirements.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "verifyTransferAuthorization",
        type: "function",
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "signature", type: "bytes" },
        ],
        outputs: [{ name: "valid", type: "bool" }],
        stateMutability: "view",
      },
    ],
    functionName: "verifyTransferAuthorization",
    args: [
      payload.authorization.from as Hex,
      payload.authorization.to as Hex,
      payload.authorization.value,
      payload.authorization.validAfter,
      payload.authorization.validBefore,
      payload.authorization.nonce as Hex,
      payload.signature as Hex,
    ],
  });

  if (!isValidSignature) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true, type: "payload" };
}

async function verifySignAndSendTransactionPayload(
  client: PublicClient,
  payload: EvmSignAndSendTransactionPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    const txData = await client.getTransaction({
      hash: payload.transactionHash as Hex,
    });

    if (!txData) {
      return {
        isValid: false,
        errorMessage: "Transaction not found",
      };
    }

    const txReceipt = await client.getTransactionReceipt({
      hash: payload.transactionHash as Hex,
    });

    if (!txReceipt) {
      return {
        isValid: false,
        errorMessage: "Transaction not yet confirmed",
      };
    }

    if (txReceipt.status !== "success") {
      return {
        isValid: false,
        errorMessage: "Transaction failed",
      };
    }

    // Use consolidated validation for transaction data
    const transferValidation = validateTransferData(txData, paymentRequirements);
    if (!transferValidation.isValid) {
      return {
        isValid: false,
        errorMessage: transferValidation.errorMessage!,
      };
    }

    // For ERC20 tokens, also validate the event log (double-check that transfer actually happened)
    if (paymentRequirements.tokenAddress !== evm.ZERO_ADDRESS) {
      const eventValidation = validateTransferEventLog(
        txReceipt.logs,
        paymentRequirements
      );
      if (!eventValidation.isValid) {
        return {
          isValid: false,
          errorMessage: eventValidation.errorMessage!,
        };
      }
    }

    // Verify signed message
    const messageVerified = await client.verifyMessage({
      address: txData.from,
      message: paymentRequirements.resource ?? `402 signature ${Date.now()}`,
      signature: payload.signedMessage as Hex,
    });

    if (!messageVerified) {
      return { isValid: false, errorMessage: "Invalid signature" };
    }

    return {
      isValid: true,
      type: "transaction",
      txHash: payload.transactionHash,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Failed to verify sign and send transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function verifySignedTransactionPayload(
  payload: EvmSignedTransactionPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    // Parse the signed transaction to validate its structure and content
    const parsedTx = parseTransaction(payload.signedTransaction as Hex);

    // Use consolidated validation
    const transferValidation = validateTransferData(parsedTx, paymentRequirements);
    if (!transferValidation.isValid) {
      return {
        isValid: false,
        errorMessage: transferValidation.errorMessage!,
      };
    }

    return {
      isValid: true,
      type: "payload",
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Failed to verify signed transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function settle(
  client: WalletClient & PublicActions,
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  try {
    if (!validateBasePayload(payload, paymentRequirements)) {
      return {
        success: false,
        transaction: "",
        namespace: payload.namespace,
        errorReason: "invalid_payload",
        error: "Invalid payload structure or version mismatch",
      };
    }

    if (!validateChain(payload, paymentRequirements)) {
      return {
        success: false,
        transaction: "",
        namespace: payload.namespace,
        errorReason: "invalid_network",
        error: "Invalid chain configuration",
      };
    }

    switch (payload.payload.type) {
      case "authorization":
        return await settleAuthorizationPayload(
          client,
          payload.payload,
          paymentRequirements,
          payload.namespace
        );

      case "signedTransaction":
        return await settleSignedTransactionPayload(
          client,
          payload.payload,
          payload.namespace
        );

      case "signAndSendTransaction":
        return {
          success: false,
          transaction: "",
          namespace: payload.namespace,
          errorReason: "invalid_scheme",
          error: "SignAndSendTransaction payloads cannot be settled (already executed)",
        };

      default:
        return {
          success: false,
          transaction: "",
          namespace: payload.namespace,
          errorReason: "invalid_payload",
          error: "Unsupported payload type",
        };
    }
  } catch (error) {
    return {
      success: false,
      transaction: "",
      namespace: payload.namespace,
      errorReason: "unexpected_settle_error",
      error: `Failed to settle payment: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function settleAuthorizationPayload(
  client: WalletClient & PublicActions,
  payload: EvmAuthorizationPayload,
  paymentRequirements: PaymentRequirements,
  namespace: string
): Promise<SettleResponse> {
  try {
    const data = encodeFunctionData({
      abi: [
        {
          name: "transferWithAuthorization",
          type: "function",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "signature", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ],
      functionName: "transferWithAuthorization",
      args: [
        payload.authorization.from as Hex,
        payload.authorization.to as Hex,
        payload.authorization.value,
        payload.authorization.validAfter,
        payload.authorization.validBefore,
        payload.authorization.nonce as Hex,
        payload.signature as Hex,
      ],
    });

    const txHash = await client.sendTransaction({
      account: client.account!,
      to: paymentRequirements.tokenAddress as Hex,
      data,
      chain: evm.getChain(paymentRequirements.networkId),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "success") {
      return {
        success: true,
        transaction: txHash,
        namespace: namespace as Namespace,
        payer: payload.authorization.from,
      };
    }

    return {
      success: false,
      transaction: txHash,
      namespace: namespace as Namespace,
      errorReason: "invalid_transaction_state",
      error: "Authorization transaction failed",
    };
  } catch (error) {
    return {
      success: false,
      transaction: "",
      namespace: namespace as Namespace,
      errorReason: "unexpected_settle_error",
      error: `Failed to settle authorization: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function settleSignedTransactionPayload(
  client: WalletClient & PublicActions,
  payload: EvmSignedTransactionPayload,
  namespace: string
): Promise<SettleResponse> {
  try {
    // Broadcast the signed transaction
    const txHash = await client.sendRawTransaction({
      serializedTransaction: payload.signedTransaction as Hex,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "success") {
      return {
        success: true,
        transaction: txHash,
        namespace: namespace as Namespace,
        payer: receipt.from,
      };
    }

    return {
      success: false,
      transaction: txHash,
      namespace: namespace as Namespace,
      errorReason: "invalid_transaction_state",
      error: "Signed transaction failed",
    };
  } catch (error) {
    return {
      success: false,
      transaction: "",
      namespace: namespace as Namespace,
      errorReason: "unexpected_settle_error",
      error: `Failed to settle signed transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export { verify, settle };
