import { evm } from "../../../shared/index.js";
import { SCHEME } from "../index.js";
import {
  VerifyResponse,
  PaymentDetails,
  PaymentPayload,
  Hex,
} from "../../../types/index.js";
import { exact } from "../../../types/index.js";
import { config } from "../../../index.js";
import {
  encodeFunctionData,
  createPublicClient,
  http,
  WalletClient,
  PublicActions,
  PublicClient,
  decodeFunctionData,
  decodeEventLog,
  keccak256,
  toBytes,
  Log,
} from "viem";

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
  payload: PaymentPayload<exact.evm.Payload>,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    if (!validateBasePayload(payload, paymentDetails)) {
      return {
        isValid: false,
        errorMessage: "Invalid payload structure or version mismatch",
      };
    }

    if (!validateChain(payload, paymentDetails)) {
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
          paymentDetails
        );
      case "nativeTransfer":
        return await verifyNativeTransferPayload(
          client,
          payload.payload,
          paymentDetails
        );
      case "tokenTransfer":
        return await verifyTokenTransferPayload(
          client,
          payload.payload,
          paymentDetails
        );
      case "signAndSendTransaction":
        return await verifySignAndSendTransactionPayload(
          client,
          payload.payload,
          paymentDetails
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
  payload: PaymentPayload<exact.evm.Payload>,
  paymentDetails: PaymentDetails
): boolean {
  return (
    payload.version === config["h402Version"] &&
    payload.scheme === SCHEME &&
    payload.namespace === paymentDetails.namespace &&
    payload.networkId === paymentDetails.networkId &&
    payload.resource === paymentDetails.resource
  );
}

function validateChain(
  payload: PaymentPayload<exact.evm.Payload>,
  paymentDetails: PaymentDetails
): boolean {
  return (
    payload.networkId === paymentDetails.networkId &&
    payload.namespace === "eip155"
  );
}

async function verifyAuthorizationPayload(
  client: PublicClient,
  payload: exact.evm.AuthorizationPayload,
  paymentDetails: PaymentDetails
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

  if (payload.authorization.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient authorized amount",
    };
  }

  if (payload.authorization.to !== paymentDetails.payToAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  const balance = await client.readContract({
    address: paymentDetails.tokenAddress as `0x${string}`,
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
    args: [payload.authorization.from],
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
        payload.authorization.from,
        payload.authorization.to,
        payload.authorization.value,
        payload.authorization.validAfter,
        payload.authorization.validBefore,
        payload.authorization.nonce,
        payload.signature,
      ],
    });

    const gasEstimate = await client.estimateGas({
      account: payload.authorization.from,
      to: paymentDetails.tokenAddress as `0x${string}`,
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
    address: paymentDetails.tokenAddress as `0x${string}`,
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
      payload.authorization.from,
      payload.authorization.to,
      payload.authorization.value,
      payload.authorization.validAfter,
      payload.authorization.validBefore,
      payload.authorization.nonce,
      payload.signature,
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

async function verifyNativeTransferPayload(
  client: PublicClient,
  payload: exact.evm.NativeTransferPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  if (payload.transaction.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient transfer amount",
    };
  }

  if (payload.transaction.to !== paymentDetails.payToAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  try {
    const gasEstimate = await client.estimateGas({
      account: payload.transaction.from,
      to: payload.transaction.to,
      value: payload.transaction.value,
    });

    const maxGasAmount = await getMaxGasForChain(client);

    if (gasEstimate > maxGasAmount) {
      return {
        isValid: false,
        errorMessage: `Transaction would require too much gas (${gasEstimate} > ${maxGasAmount})`,
      };
    }

    const balance = await client.getBalance({
      address: payload.transaction.from,
    });
    if (balance < payload.transaction.value) {
      return {
        isValid: false,
        errorMessage: "Insufficient balance including maximum gas cost",
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

  const hash = await client.getTransaction({ hash: payload.signature });
  const recoveredAddress = await client.verifyMessage({
    address: payload.transaction.from,
    message: { raw: hash?.input || "0x" },
    signature: payload.signature,
  });

  if (!recoveredAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true, type: "payload" };
}

async function verifyTokenTransferPayload(
  client: PublicClient,
  payload: exact.evm.TokenTransferPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  if (payload.transaction.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient transfer amount",
    };
  }

  if (payload.transaction.to !== paymentDetails.payToAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  const balance = await client.readContract({
    address: paymentDetails.tokenAddress as `0x${string}`,
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
    args: [payload.transaction.from],
  });

  if (balance < payload.transaction.value) {
    return {
      isValid: false,
      errorMessage: "Insufficient token balance",
    };
  }

  try {
    const gasEstimate = await client.estimateGas({
      account: payload.transaction.from,
      to: paymentDetails.tokenAddress as `0x${string}`,
      data: payload.transaction.data,
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

  const hash = await client.getTransaction({ hash: payload.signature });
  const recoveredAddress = await client.verifyMessage({
    address: payload.transaction.from,
    message: { raw: hash?.input || "0x" },
    signature: payload.signature,
  });

  if (!recoveredAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true, type: "payload" };
}

async function verifySignAndSendTransactionPayload(
  client: PublicClient,
  payload: exact.evm.SignAndSendTransactionPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    const txData = await client.getTransaction({
      hash: payload.transactionHash,
    });

    if (!txData) {
      return {
        isValid: false,
        errorMessage: "Transaction not found",
      };
    }

    const txReceipt = await client.getTransactionReceipt({
      hash: payload.transactionHash,
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

    if (paymentDetails.tokenAddress === evm.ZERO_ADDRESS) {
      if (txData.value < paymentDetails.amountRequired) {
        return {
          isValid: false,
          errorMessage: "Insufficient transfer amount",
        };
      }
      if (
        txData.to?.toLowerCase() !==
        (paymentDetails.payToAddress as Hex).toLowerCase()
      ) {
        return {
          isValid: false,
          errorMessage: "Invalid recipient address",
        };
      }
    } else {
      if (
        txData.to?.toLowerCase() !==
        (paymentDetails.tokenAddress as Hex).toLowerCase()
      ) {
        return {
          isValid: false,
          errorMessage: "Invalid token contract address",
        };
      }

      try {
        const decodedInput = decodeFunctionData({
          abi: [
            {
              name: "transfer",
              type: "function",
              inputs: [
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
              ],
              outputs: [{ name: "success", type: "bool" }],
              stateMutability: "nonpayable",
            },
          ],
          data: txData.input,
        });

        if (decodedInput.functionName !== "transfer") {
          return {
            isValid: false,
            errorMessage: "Not a transfer function call",
          };
        }

        const [recipient, amount] = decodedInput.args;
        if (
          recipient.toLowerCase() !==
          (paymentDetails.payToAddress as Hex).toLowerCase()
        ) {
          return {
            isValid: false,
            errorMessage: "Invalid transfer recipient",
          };
        }
        if (amount < paymentDetails.amountRequired) {
          return {
            isValid: false,
            errorMessage: "Insufficient transfer amount",
          };
        }
      } catch (error) {
        return {
          isValid: false,
          errorMessage: "Invalid transfer data",
        };
      }

      const transferEvent = txReceipt.logs.find(
        (log) =>
          log.address.toLowerCase() ===
            (paymentDetails.tokenAddress as Hex).toLowerCase() &&
          log.topics[0] ===
            keccak256(toBytes("Transfer(address,address,uint256)"))
      );

      if (!transferEvent) {
        return {
          isValid: false,
          errorMessage: "No transfer event found",
        };
      }

      const decodedEvent = decodeEventLog({
        abi: [
          {
            name: "Transfer",
            type: "event",
            inputs: [
              { name: "from", type: "address", indexed: true },
              { name: "to", type: "address", indexed: true },
              { name: "value", type: "uint256", indexed: false },
            ],
          },
        ],
        data: transferEvent.data,
        topics: transferEvent.topics,
      });

      if (
        decodedEvent.args.to.toLowerCase() !==
          (paymentDetails.payToAddress as Hex).toLowerCase() ||
        decodedEvent.args.value < paymentDetails.amountRequired
      ) {
        return {
          isValid: false,
          errorMessage: "Transfer event data does not match requirements",
        };
      }
    }

    const messageVerified = await client.verifyMessage({
      address: txData.from,
      message: paymentDetails.resource,
      signature: payload.signedMessage,
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

async function settle(
  client: WalletClient & PublicActions,
  payload: PaymentPayload<exact.evm.Payload>,
  paymentDetails: PaymentDetails
): Promise<{ txHash: string } | { errorMessage: string }> {
  try {
    if (!validateBasePayload(payload, paymentDetails)) {
      return { errorMessage: "Invalid payload structure or version mismatch" };
    }

    if (!validateChain(payload, paymentDetails)) {
      return { errorMessage: "Invalid chain configuration" };
    }

    if (payload.payload.type === "signAndSendTransaction") {
      return { errorMessage: "This payload type is not supported" };
    }

    const txHash = await client.sendRawTransaction({
      serializedTransaction: payload.payload.signature as Hex,
    });

    const publicClient = createPublicClient({
      chain: evm.getChain(paymentDetails.networkId),
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status === "success") {
      return { txHash };
    }

    return { errorMessage: "Transaction failed" };
  } catch (error) {
    return {
      errorMessage: `Failed to settle payment: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export { verify, settle };
