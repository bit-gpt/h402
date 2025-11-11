import { describe, it, expect } from "vitest";
import { selectPaymentRequirements } from "./selectPaymentRequirements.js";
import { PaymentRequirements } from "../types/index.js";

describe("selectPaymentRequirements", () => {
  describe("stablecoin prioritization", () => {
    it("should prioritize USDT over non-stablecoin", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "ETH",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "56",
          tokenAddress: "0x55d398326f99059ff775485246999027b3197955",
          tokenSymbol: "USDT",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.tokenSymbol).toBe("USDT");
    });

    it("should prioritize USDC by address", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "1514",
          tokenAddress: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.tokenAddress).toBe("0xF1815bd50389c46847f0Bda824eC8da914045D14");
    });

    it("should return first requirement when no stablecoin is available", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "ETH",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "137",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "MATIC",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.tokenSymbol).toBe("ETH");
    });
  });

  describe("namespace filtering", () => {
    it("should filter by EVM namespace", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "solana",
          networkId: "mainnet",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "evm");
      expect(result.namespace).toBe("evm");
      expect(result.tokenSymbol).toBe("USDT");
    });

    it("should filter by Solana namespace", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "solana",
          networkId: "mainnet",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "solana");
      expect(result.namespace).toBe("solana");
    });

    it("should filter by Arkade namespace", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "arkade",
          networkId: "bitcoin",
          tokenSymbol: "BTC",
          tokenDecimals: 8,
          payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          amountRequired: 1000,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "arkade");
      expect(result.namespace).toBe("arkade");
      expect(result.tokenSymbol).toBe("BTC");
    });
  });

  describe("network filtering", () => {
    it("should filter by EVM network (Base)", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "137",
          tokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, undefined, "base");
      expect(result.networkId).toBe("8453");
    });

    it("should filter by EVM network (Polygon)", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "137",
          tokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, undefined, "polygon");
      expect(result.networkId).toBe("137");
    });

    it("should filter by Solana network", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "solana",
          networkId: "mainnet",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, undefined, "solana");
      expect(result.namespace).toBe("solana");
    });

    it("should filter by Arkade network (Bitcoin)", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "arkade",
          networkId: "bitcoin",
          tokenSymbol: "BTC",
          tokenDecimals: 8,
          payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          amountRequired: 1000,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, undefined, "bitcoin");
      expect(result.namespace).toBe("arkade");
      expect(result.networkId).toBe("bitcoin");
    });
  });

  describe("scheme filtering", () => {
    it("should filter by exact scheme", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, undefined, undefined, "exact");
      expect(result.scheme).toBe("exact");
    });
  });

  describe("combined filtering", () => {
    it("should filter by namespace and network", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "137",
          tokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "solana",
          networkId: "mainnet",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "evm", "base");
      expect(result.namespace).toBe("evm");
      expect(result.networkId).toBe("8453");
    });

    it("should filter by namespace, network, and scheme", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "solana",
          networkId: "mainnet",
          tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "evm", "base", "exact");
      expect(result.namespace).toBe("evm");
      expect(result.networkId).toBe("8453");
      expect(result.scheme).toBe("exact");
    });
  });

  describe("fallback behavior", () => {
    it("should return first requirement when no matches found", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "ETH",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "137",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "MATIC",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements, "solana");
      expect(result).toBeDefined();
      expect(result.namespace).toBe("evm");
      expect(result.networkId).toBe("8453");
    });

    it("should handle single requirement array", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result).toBe(requirements[0]);
    });
  });

  describe("stablecoin detection edge cases", () => {
    it("should recognize USDT symbol with case insensitivity", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "ETH",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "56",
          tokenAddress: "0x0000000000000000000000000000000000000001",
          tokenSymbol: "usdt",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.tokenSymbol).toBe("usdt");
    });

    it("should not treat Arkade BTC as stablecoin", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "arkade",
          networkId: "bitcoin",
          tokenSymbol: "BTC",
          tokenDecimals: 8,
          payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          amountRequired: 1000,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenSymbol: "ETH",
          tokenDecimals: 18,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.namespace).toBe("arkade");
    });

    it("should prioritize stablecoin even with Arkade present", () => {
      const requirements: PaymentRequirements[] = [
        {
          namespace: "arkade",
          networkId: "bitcoin",
          tokenSymbol: "BTC",
          tokenDecimals: 8,
          payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          amountRequired: 1000,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
        {
          namespace: "evm",
          networkId: "8453",
          tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        },
      ];

      const result = selectPaymentRequirements(requirements);
      expect(result.tokenSymbol).toBe("USDT");
      expect(result.namespace).toBe("evm");
    });
  });

  describe("all EVM networks", () => {
    const evmNetworks = [
      { name: "base", chainId: "8453" },
      { name: "avalanche", chainId: "43114" },
      { name: "iotex", chainId: "4689" },
      { name: "bsc", chainId: "56" },
      { name: "polygon", chainId: "137" },
      { name: "sei", chainId: "1329" },
      { name: "story", chainId: "1514" },
      { name: "abstract", chainId: "2741" },
      { name: "peaq", chainId: "3338" },
    ];

    evmNetworks.forEach(({ name, chainId }) => {
      it(`should filter by ${name} network`, () => {
        const requirements: PaymentRequirements[] = [
          {
            namespace: "evm",
            networkId: "8453",
            tokenAddress: "0x0000000000000000000000000000000000000000",
            payToAddress: "0x1234567890123456789012345678901234567890",
            amountRequired: 100,
            amountRequiredFormat: "smallestUnit",
            scheme: "exact",
          },
          {
            namespace: "evm",
            networkId: chainId,
            tokenAddress: "0x0000000000000000000000000000000000000001",
            tokenSymbol: "USDT",
            tokenDecimals: 6,
            payToAddress: "0x1234567890123456789012345678901234567890",
            amountRequired: 100,
            amountRequiredFormat: "smallestUnit",
            scheme: "exact",
          },
        ];

        const result = selectPaymentRequirements(
          requirements,
          undefined,
          name as any
        );
        expect(result.networkId).toBe(chainId);
      });
    });
  });
});

