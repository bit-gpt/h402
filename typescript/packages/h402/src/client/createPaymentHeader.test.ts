import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentHeader } from "./createPaymentHeader.js";
import { PaymentClient, PaymentRequirements } from "../types/index.js";
import { exact } from "../schemes/index.js";

vi.mock("../schemes/index.js", () => ({
  exact: {
    handlers: {
      evm: {
        createPayment: vi.fn(),
      },
      solana: {
        createPayment: vi.fn(),
      },
      arkade: {
        createPayment: vi.fn(),
      },
    },
  },
}));

vi.mock("../shared/index.js", () => ({
  evm: {
    chains: {
      "8453": {},
      "137": {},
      "56": {},
      "43114": {},
      "4689": {},
      "1329": {},
      "1514": {},
      "2741": {},
      "3338": {},
    },
  },
}));

vi.mock("../shared/parsePaymentRequirements.js", () => ({
  parsePaymentRequirementsForAmount: vi.fn((requirements, _client) => {
    return Promise.resolve(requirements);
  }),
}));

describe("createPaymentHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("should throw error if namespace is missing", async () => {
      const client: PaymentClient = {};
      const paymentRequirements = {} as PaymentRequirements;

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("Payment details namespace is required");
    });

    it("should throw error if evmClient is missing for EVM payments", async () => {
      const client: PaymentClient = {};
      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        tokenSymbol: "USDT",
        tokenDecimals: 6,
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("evmClient is required for EVM payments");
    });

    it("should throw error if EVM network is unsupported", async () => {
      const mockEvmClient = {
        chain: { id: 999 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "999",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("Unsupported EVM Network: 999");
    });

    it("should throw error if chainId doesn't match networkId", async () => {
      const mockEvmClient = {
        chain: { id: 137 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("EVM client chainId doesn't match payment networkId: 8453");
    });

    it("should throw error if solanaClient is missing for Solana payments", async () => {
      const client: PaymentClient = {};
      const paymentRequirements: PaymentRequirements = {
        namespace: "solana",
        networkId: "mainnet",
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
        payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("solanaClient is required for Solana payments");
    });

    it("should throw error if solanaClient.publicKey is missing", async () => {
      const client: PaymentClient = {
        solanaClient: {} as any,
      };
      const paymentRequirements: PaymentRequirements = {
        namespace: "solana",
        networkId: "mainnet",
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
        payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("solanaClient.publicKey is required for Solana payments");
    });

    it("should throw error if arkadeClient is missing for Arkade payments", async () => {
      const client: PaymentClient = {};
      const paymentRequirements: PaymentRequirements = {
        namespace: "arkade",
        networkId: "bitcoin",
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        amountRequired: 1000,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("arkadeClient is required for Arkade payments");
    });

    it("should throw error if arkadeClient doesn't implement signAndSendTransaction", async () => {
      const client: PaymentClient = {
        arkadeClient: {} as any,
      };
      const paymentRequirements: PaymentRequirements = {
        namespace: "arkade",
        networkId: "bitcoin",
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        amountRequired: 1000,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("arkadeClient must implement signAndSendTransaction");
    });
  });

  describe("EVM payment creation", () => {
    it("should successfully create EVM payment with exact scheme", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        tokenSymbol: "USDT",
        tokenDecimals: 6,
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const expectedHeader = "h402-payment-header";
      vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue(expectedHeader);

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe(expectedHeader);
      expect(exact.handlers.evm.createPayment).toHaveBeenCalledWith(
        mockEvmClient,
        1,
        paymentRequirements
      );
    });

    it("should throw error for unsupported EVM scheme", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const invalidRequirements = { ...paymentRequirements, scheme: "unsupported" } as any;

      await expect(
        createPaymentHeader(client, 1, invalidRequirements)
      ).rejects.toThrow("Unsupported scheme: unsupported");
    });
  });

  describe("Solana payment creation", () => {
    it("should successfully create Solana payment with exact scheme", async () => {
      const mockSolanaClient = {
        publicKey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        signAndSendTransaction: vi.fn(),
      } as any;

      const client: PaymentClient = {
        solanaClient: mockSolanaClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "solana",
        networkId: "mainnet",
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
        payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const expectedHeader = "solana-payment-header";
      vi.mocked(exact.handlers.solana.createPayment).mockResolvedValue(expectedHeader);

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe(expectedHeader);
      expect(exact.handlers.solana.createPayment).toHaveBeenCalledWith(
        mockSolanaClient,
        1,
        paymentRequirements
      );
    });

    it("should throw error for unsupported Solana scheme", async () => {
      const mockSolanaClient = {
        publicKey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        signAndSendTransaction: vi.fn(),
      } as any;

      const client: PaymentClient = {
        solanaClient: mockSolanaClient,
      };

      const paymentRequirements = {
        namespace: "solana",
        networkId: "mainnet",
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payToAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "unsupported",
      } as any;

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("Unsupported scheme for Solana: unsupported");
    });
  });

  describe("Arkade payment creation", () => {
    it("should successfully create Arkade payment with exact scheme", async () => {
      const mockArkadeClient = {
        signAndSendTransaction: vi.fn(),
        identity: {} as any,
      } as any;

      const client: PaymentClient = {
        arkadeClient: mockArkadeClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "arkade",
        networkId: "bitcoin",
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        amountRequired: 1000,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      const expectedHeader = "arkade-payment-header";
      vi.mocked(exact.handlers.arkade.createPayment).mockResolvedValue(expectedHeader);

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe(expectedHeader);
      expect(exact.handlers.arkade.createPayment).toHaveBeenCalledWith(
        mockArkadeClient,
        1,
        paymentRequirements
      );
    });

    it("should throw error for unsupported Arkade scheme", async () => {
      const mockArkadeClient = {
        signAndSendTransaction: vi.fn(),
      } as any;

      const client: PaymentClient = {
        arkadeClient: mockArkadeClient,
      };

      const paymentRequirements = {
        namespace: "arkade",
        networkId: "bitcoin",
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        payToAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        amountRequired: 1000,
        amountRequiredFormat: "smallestUnit",
        scheme: "unsupported",
      } as any;

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("Unsupported scheme for Arkade: unsupported");
    });
  });

  describe("multiple EVM networks", () => {
    const evmNetworks = [
      { name: "Base", chainId: 8453, networkId: "8453" },
      { name: "Polygon", chainId: 137, networkId: "137" },
      { name: "BSC", chainId: 56, networkId: "56" },
      { name: "Avalanche", chainId: 43114, networkId: "43114" },
      { name: "IoTeX", chainId: 4689, networkId: "4689" },
      { name: "Sei", chainId: 1329, networkId: "1329" },
      { name: "Story", chainId: 1514, networkId: "1514" },
      { name: "Abstract", chainId: 2741, networkId: "2741" },
      { name: "Peaq", chainId: 3338, networkId: "3338" },
    ];

    evmNetworks.forEach(({ name, chainId, networkId }) => {
      it(`should create payment for ${name} network`, async () => {
        const mockEvmClient = {
          chain: { id: chainId },
        } as any;

        const client: PaymentClient = {
          evmClient: mockEvmClient,
        };

        const paymentRequirements: PaymentRequirements = {
          namespace: "evm",
          networkId: networkId,
          tokenAddress: "0x0000000000000000000000000000000000000000",
          payToAddress: "0x1234567890123456789012345678901234567890",
          amountRequired: 100,
          amountRequiredFormat: "smallestUnit",
          scheme: "exact",
        };

        const expectedHeader = `${name.toLowerCase()}-payment-header`;
        vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue(expectedHeader);

        const result = await createPaymentHeader(client, 1, paymentRequirements);

        expect(result).toBe(expectedHeader);
        expect(exact.handlers.evm.createPayment).toHaveBeenCalledWith(
          mockEvmClient,
          1,
          paymentRequirements
        );
      });
    });
  });

  describe("h402 version handling", () => {
    it("should pass h402 version to payment creation", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue("header");

      await createPaymentHeader(client, 1, paymentRequirements);

      expect(exact.handlers.evm.createPayment).toHaveBeenCalledWith(
        mockEvmClient,
        1,
        paymentRequirements
      );
    });
  });

  describe("exhaustive type checking", () => {
    it("should handle exhaustive check for unknown namespace", async () => {
      const { parsePaymentRequirementsForAmount } = await import(
        "../shared/parsePaymentRequirements.js"
      );
      
      const client: PaymentClient = {
        evmClient: {
          chain: { id: 123 },
        } as any,
      };
      const paymentRequirements = {
        namespace: "unknown",
        networkId: "123",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      } as any;

      vi.mocked(parsePaymentRequirementsForAmount).mockResolvedValueOnce(
        paymentRequirements
      );

      await expect(
        createPaymentHeader(client, 1, paymentRequirements)
      ).rejects.toThrow("Unsupported namespace: unknown");
      
      vi.mocked(parsePaymentRequirementsForAmount).mockImplementation(
        (requirements, _client) => Promise.resolve(requirements)
      );
    });
  });

  describe("edge cases", () => {
    it("should handle payment requirements with optional fields", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 100,
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
        description: "Test payment",
        resource: "https://example.com/resource",
        mimeType: "application/json",
        estimatedProcessingTime: 3600,
        extra: { customField: "value" },
      };

      const expectedHeader = "header-with-optional-fields";
      vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue(expectedHeader);

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe(expectedHeader);
      expect(exact.handlers.evm.createPayment).toHaveBeenCalledWith(
        mockEvmClient,
        1,
        paymentRequirements
      );
    });

    it("should handle BigInt amount values", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: BigInt(1000000),
        amountRequiredFormat: "smallestUnit",
        scheme: "exact",
      };

      vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue("bigint-header");

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe("bigint-header");
    });

    it("should handle humanReadable amount format", async () => {
      const mockEvmClient = {
        chain: { id: 8453 },
      } as any;

      const client: PaymentClient = {
        evmClient: mockEvmClient,
      };

      const paymentRequirements: PaymentRequirements = {
        namespace: "evm",
        networkId: "8453",
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        tokenSymbol: "USDT",
        tokenDecimals: 6,
        payToAddress: "0x1234567890123456789012345678901234567890",
        amountRequired: 1.5,
        amountRequiredFormat: "humanReadable",
        scheme: "exact",
      };

      vi.mocked(exact.handlers.evm.createPayment).mockResolvedValue("human-readable-header");

      const result = await createPaymentHeader(client, 1, paymentRequirements);

      expect(result).toBe("human-readable-header");
    });
  });
});

