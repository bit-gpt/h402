import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateTransferData,
  validateTransferEventLog,
  validateNativeTransfer,
  validateERC20Transfer,
} from "./validation.js";
import { PaymentRequirements } from "../../../types/index.js";
import { Hex } from "viem";

vi.mock("../../../shared/parsePaymentRequirements.js", () => ({
  parsePaymentRequirementsForAmount: vi.fn((requirements) => {
    return Promise.resolve(requirements);
  }),
}));

describe("validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateNativeTransfer", () => {
    it("should validate successful native transfer", () => {
      const txData = {
        to: "0x1234567890123456789012345678901234567890" as Hex,
        value: BigInt(1000000000000000000),
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateNativeTransfer(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
      expect(result.transferDetails?.isNativeTransfer).toBe(true);
      expect(result.transferDetails?.amount).toBe(paymentRequirements.amountRequired);
      expect(result.transferDetails?.recipient).toBe(paymentRequirements.payToAddress);
    });

    it("should fail validation for insufficient transfer amount", () => {
      const txData = {
        to: "0x1234567890123456789012345678901234567890" as Hex,
        value: BigInt(500000000000000000),
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateNativeTransfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Insufficient transfer amount");
    });

    it("should fail validation for incorrect recipient", () => {
      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
        value: BigInt(1000000000000000000),
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateNativeTransfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Invalid recipient address");
    });

    it("should handle missing value field", () => {
      const txData = {
        to: "0x1234567890123456789012345678901234567890" as Hex,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateNativeTransfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Insufficient transfer amount");
    });

    it("should be case-insensitive for addresses", () => {
      const txData = {
        to: "0xf9a267963A22C30ad80D451DCDb3011837d944b5" as Hex,
        value: BigInt(1000000000000000000),
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0xf9a267963A22C30ad80D451DCDb3011837d944b5".toUpperCase(),
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateNativeTransfer(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateERC20Transfer", () => {
    it("should validate successful ERC20 transfer", async () => {
      const transferData =
        "0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a";

      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
        data: transferData,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateERC20Transfer(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
      expect(result.transferDetails?.isNativeTransfer).toBe(false);
      expect(result.transferDetails?.amount).toBe(BigInt(10));
      expect(result.transferDetails?.recipient).toBe(paymentRequirements.payToAddress);
    });

    it("should fail validation for incorrect token contract", async () => {
      const txData = {
        to: "0x9999999999999999999999999999999999999999" as Hex,
        data: "0xa9059cbb",
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateERC20Transfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Invalid token contract address");
    });

    it("should fail validation for missing transaction data", async () => {
      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateERC20Transfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("No transaction data found");
    });

    it("should fail validation for invalid transfer data", async () => {
      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
        data: "0xinvalid",
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateERC20Transfer(txData, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Invalid transfer data");
    });

    it("should use input field if data field is missing", async () => {
      const transferData =
        "0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a";

      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
        input: transferData,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateERC20Transfer(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateTransferData", () => {
    it("should route to native transfer validation", async () => {
      const txData = {
        to: "0x1234567890123456789012345678901234567890" as Hex,
        value: BigInt(1000000000000000000),
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0x0000000000000000000000000000000000000000",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000000000000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateTransferData(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
      expect(result.transferDetails?.isNativeTransfer).toBe(true);
    });

    it("should route to ERC20 transfer validation", async () => {
      const transferData =
        "0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a";

      const txData = {
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex,
        data: transferData,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = await validateTransferData(txData, paymentRequirements);

      expect(result.isValid).toBe(true);
      expect(result.transferDetails?.isNativeTransfer).toBe(false);
    });
  });

  describe("validateTransferEventLog", () => {
    it("should validate transfer event log successfully", () => {
      const logs = [
        {
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009999999999999999999999999999999999999999",
            "0x0000000000000000000000001234567890123456789012345678901234567890",
          ],
          data: "0x000000000000000000000000000000000000000000000000000000000000000a",
        },
      ];

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateTransferEventLog(logs, paymentRequirements);

      expect(result.isValid).toBe(true);
      expect(result.transferDetails?.amount).toBe(BigInt(10));
    });

    it("should fail when no transfer event found", () => {
      const logs = [
        {
          address: "0x9999999999999999999999999999999999999999",
          topics: ["0x1234567890abcdef"],
          data: "0x00",
        },
      ];

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateTransferEventLog(logs, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("No transfer event found");
    });

    it("should fail when transfer amount is insufficient", () => {
      const logs = [
        {
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009999999999999999999999999999999999999999",
            "0x0000000000000000000000001234567890123456789012345678901234567890",
          ],
          data: "0x0000000000000000000000000000000000000000000000000000000000000005",
        },
      ];

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateTransferEventLog(logs, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Transfer event data does not match requirements");
    });

    it("should fail when recipient doesn't match", () => {
      const logs = [
        {
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009999999999999999999999999999999999999999",
            "0x0000000000000000000000009999999999999999999999999999999999999999",
          ],
          data: "0x000000000000000000000000000000000000000000000000000000000000000a",
        },
      ];

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateTransferEventLog(logs, paymentRequirements);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Transfer event data does not match requirements");
    });

    it("should be case-insensitive for token address", () => {
      const logs = [
        {
          address: "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009999999999999999999999999999999999999999",
            "0x0000000000000000000000001234567890123456789012345678901234567890",
          ],
          data: "0x000000000000000000000000000000000000000000000000000000000000000a",
        },
      ];

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(10),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const result = validateTransferEventLog(logs, paymentRequirements);

      expect(result.isValid).toBe(true);
    });
  });
});

