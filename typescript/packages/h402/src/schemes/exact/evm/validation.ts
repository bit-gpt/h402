import {
  decodeFunctionData,
  decodeEventLog,
  keccak256,
  toBytes,
  Hex,
} from "viem";
import { evm } from "../../../shared/index.js";
import { PaymentRequirements } from "../../../types";

// Transfer validation types and interfaces
interface TransactionData {
  to?: Hex | null;
  value?: bigint;
  input?: string;
  data?: string;
}

interface TransferValidationResult {
  isValid: boolean;
  errorMessage?: string;
  transferDetails?: {
    recipient: string;
    amount: bigint;
    isNativeTransfer: boolean;
  };
}

interface TransferEventLog {
  address: string;
  topics: readonly string[];
  data: string;
}

/**
 * Validates transfer data for both native and ERC20 token transfers
 */
function validateTransferData(
  txData: TransactionData,
  paymentRequirements: PaymentRequirements
): TransferValidationResult {
  const isNativeTransfer = paymentRequirements.tokenAddress === evm.ZERO_ADDRESS;

  if (isNativeTransfer) {
    return validateNativeTransfer(txData, paymentRequirements);
  } else {
    return validateERC20Transfer(txData, paymentRequirements);
  }
}

/**
 * Validates native token (ETH) transfers
 */
function validateNativeTransfer(
  txData: TransactionData,
  paymentRequirements: PaymentRequirements
): TransferValidationResult {
  // Check transfer amount
  const transferAmount = txData.value ?? 0n;
  if (transferAmount < paymentRequirements.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient transfer amount",
    };
  }

  // Check recipient address
  if (
    txData.to?.toLowerCase() !==
    (paymentRequirements.payToAddress as Hex).toLowerCase()
  ) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  return {
    isValid: true,
    transferDetails: {
      recipient: paymentRequirements.payToAddress,
      amount: transferAmount,
      isNativeTransfer: true,
    },
  };
}

/**
 * Validates ERC20 token transfers
 */
function validateERC20Transfer(
  txData: TransactionData,
  paymentRequirements: PaymentRequirements
): TransferValidationResult {
  // Check if transaction is to the correct token contract
  if (
    txData.to?.toLowerCase() !==
    (paymentRequirements.tokenAddress as Hex).toLowerCase()
  ) {
    return {
      isValid: false,
      errorMessage: "Invalid token contract address",
    };
  }

  // Parse and validate the transfer function call
  const transferData = txData.input || txData.data;
  if (!transferData) {
    return {
      isValid: false,
      errorMessage: "No transaction data found",
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
      data: transferData as Hex,
    });

    if (decodedInput.functionName !== "transfer") {
      return {
        isValid: false,
        errorMessage: "Not a transfer function call",
      };
    }

    const [recipient, amount] = decodedInput.args;

    // Validate recipient
    if (
      recipient.toLowerCase() !==
      (paymentRequirements.payToAddress as Hex).toLowerCase()
    ) {
      return {
        isValid: false,
        errorMessage: "Invalid transfer recipient",
      };
    }

    // Validate amount
    if (amount < paymentRequirements.amountRequired) {
      return {
        isValid: false,
        errorMessage: "Insufficient transfer amount",
      };
    }

    return {
      isValid: true,
      transferDetails: {
        recipient: recipient,
        amount: amount,
        isNativeTransfer: false,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: "Invalid transfer data: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Validates transfer event logs from transaction receipt
 * Only used for ERC20 transfers in executed transactions
 */
function validateTransferEventLog(
  logs: TransferEventLog[],
  paymentRequirements: PaymentRequirements
): TransferValidationResult {
  const transferEvent = logs.find(
    (log) =>
      log.address.toLowerCase() ===
      (paymentRequirements.tokenAddress as Hex).toLowerCase() &&
      log.topics[0] === keccak256(toBytes("Transfer(address,address,uint256)"))
  );

  if (!transferEvent) {
    return {
      isValid: false,
      errorMessage: "No transfer event found",
    };
  }

  try {
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
      data: transferEvent.data as Hex,
      topics: transferEvent.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
    });

    // Validate recipient and amount from event
    if (
      decodedEvent.args.to.toLowerCase() !==
      (paymentRequirements.payToAddress as Hex).toLowerCase() ||
      decodedEvent.args.value < paymentRequirements.amountRequired
    ) {
      return {
        isValid: false,
        errorMessage: "Transfer event data does not match requirements",
      };
    }

    return {
      isValid: true,
      transferDetails: {
        recipient: decodedEvent.args.to,
        amount: decodedEvent.args.value,
        isNativeTransfer: false,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: "Failed to decode transfer event: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }
}

export {
  validateTransferData,
  validateTransferEventLog,
  validateNativeTransfer,
  validateERC20Transfer,
  type TransferValidationResult,
  type TransactionData,
  type TransferEventLog,
};
