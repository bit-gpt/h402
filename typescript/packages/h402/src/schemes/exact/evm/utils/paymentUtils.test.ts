import { describe, it, expect } from "vitest";
import { encodePaymentPayload, decodePaymentPayload } from "./paymentUtils.js";
import { EvmPaymentPayload } from "../../../../types/index.js";

describe("paymentUtils", () => {
  describe("encodePaymentPayload and decodePaymentPayload", () => {
    describe("authorization payload", () => {
      it("should encode and decode authorization payload correctly", () => {
        const authPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "authorization",
            signature: "0x1234567890abcdef",
            authorization: {
              from: "0x1234567890123456789012345678901234567890",
              to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              value: BigInt(1000000),
              validAfter: BigInt(1234567890),
              validBefore: BigInt(1234567990),
              nonce: "0xabcdef1234567890",
              version: "1",
            },
          },
        };

        const encoded = encodePaymentPayload(authPayload);
        expect(encoded).toBeDefined();
        expect(typeof encoded).toBe("string");

        const decoded = decodePaymentPayload(encoded);
        expect(decoded.h402Version).toBe(authPayload.h402Version);
        expect(decoded.scheme).toBe(authPayload.scheme);
        expect(decoded.namespace).toBe(authPayload.namespace);
        expect(decoded.networkId).toBe(authPayload.networkId);
        expect(decoded.resource).toBe(authPayload.resource);
        expect(decoded.payload.type).toBe(authPayload.payload.type);

        if (decoded.payload.type === "authorization" && authPayload.payload.type === "authorization") {
          expect(decoded.payload.authorization.from).toBe(
            authPayload.payload.authorization.from
          );
          expect(decoded.payload.authorization.to).toBe(
            authPayload.payload.authorization.to
          );
          expect(decoded.payload.authorization.value).toBe(
            authPayload.payload.authorization.value
          );
          expect(decoded.payload.authorization.validAfter).toBe(
            authPayload.payload.authorization.validAfter
          );
          expect(decoded.payload.authorization.validBefore).toBe(
            authPayload.payload.authorization.validBefore
          );
          expect(decoded.payload.authorization.nonce).toBe(
            authPayload.payload.authorization.nonce
          );
          expect(decoded.payload.authorization.version).toBe(
            authPayload.payload.authorization.version
          );
          expect(decoded.payload.signature).toBe(authPayload.payload.signature);
        }
      });

      it("should handle large BigInt values", () => {
        const authPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "authorization",
            signature: "0x1234567890abcdef",
            authorization: {
              from: "0x1234567890123456789012345678901234567890",
              to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              value: BigInt("999999999999999999999999"),
              validAfter: BigInt("9999999999"),
              validBefore: BigInt("99999999999"),
              nonce: "0xabcdef1234567890",
              version: "1",
            },
          },
        };

        const encoded = encodePaymentPayload(authPayload);
        const decoded = decodePaymentPayload(encoded);

        expect(decoded.payload.type).toBe(authPayload.payload.type);
        if (decoded.payload.type === "authorization" && authPayload.payload.type === "authorization") {
          expect(decoded.payload.authorization.value).toBe(
            authPayload.payload.authorization.value
          );
        }
      });
    });

    describe("signedTransaction payload", () => {
      it("should encode and decode signedTransaction payload correctly", () => {
        const signedTxPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "signedTransaction",
            signedTransaction: "0xf86c808504a817c800825208941234567890123456789012345678901234567890880de0b6b3a764000080820a95a0",
            signedMessage: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          },
        };

        const encoded = encodePaymentPayload(signedTxPayload);
        expect(encoded).toBeDefined();
        expect(typeof encoded).toBe("string");

        const decoded = decodePaymentPayload(encoded);
        expect(decoded.h402Version).toBe(signedTxPayload.h402Version);
        expect(decoded.scheme).toBe(signedTxPayload.scheme);
        expect(decoded.namespace).toBe(signedTxPayload.namespace);
        expect(decoded.networkId).toBe(signedTxPayload.networkId);
        expect(decoded.resource).toBe(signedTxPayload.resource);
        expect(decoded.payload.type).toBe(signedTxPayload.payload.type);

        if (decoded.payload.type === "signedTransaction" && signedTxPayload.payload.type === "signedTransaction") {
          expect(decoded.payload.signedTransaction).toBe(
            signedTxPayload.payload.signedTransaction
          );
          expect(decoded.payload.signedMessage).toBe(
            signedTxPayload.payload.signedMessage
          );
        }
      });

      it("should handle long signed transactions", () => {
        const longSignedTx = "0x" + "a".repeat(500);
        const signedTxPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "signedTransaction",
            signedTransaction: longSignedTx,
            signedMessage: "0x1234567890abcdef",
          },
        };

        const encoded = encodePaymentPayload(signedTxPayload);
        const decoded = decodePaymentPayload(encoded);

        expect(decoded.payload.type).toBe(signedTxPayload.payload.type);
        if (decoded.payload.type === "signedTransaction") {
          expect(decoded.payload.signedTransaction).toBe(longSignedTx);
        }
      });
    });

    describe("signAndSendTransaction payload", () => {
      it("should encode and decode signAndSendTransaction payload correctly", () => {
        const signAndSendPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "signAndSendTransaction",
            transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            signedMessage: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          },
        };

        const encoded = encodePaymentPayload(signAndSendPayload);
        expect(encoded).toBeDefined();
        expect(typeof encoded).toBe("string");

        const decoded = decodePaymentPayload(encoded);
        expect(decoded.h402Version).toBe(signAndSendPayload.h402Version);
        expect(decoded.scheme).toBe(signAndSendPayload.scheme);
        expect(decoded.namespace).toBe(signAndSendPayload.namespace);
        expect(decoded.networkId).toBe(signAndSendPayload.networkId);
        expect(decoded.resource).toBe(signAndSendPayload.resource);
        expect(decoded.payload.type).toBe(signAndSendPayload.payload.type);

        if (decoded.payload.type === "signAndSendTransaction" && signAndSendPayload.payload.type === "signAndSendTransaction") {
          expect(decoded.payload.transactionHash).toBe(
            signAndSendPayload.payload.transactionHash
          );
          expect(decoded.payload.signedMessage).toBe(
            signAndSendPayload.payload.signedMessage
          );
        }
      });
    });

    describe("validation errors", () => {
      it("should throw error for invalid JSON", () => {
        expect(() => decodePaymentPayload("invalid-base64")).toThrow();
      });

      it("should throw error for missing payload", () => {
        const invalidPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
        };

        const encoded = Buffer.from(JSON.stringify(invalidPayload)).toString("base64");
        expect(() => decodePaymentPayload(encoded)).toThrow();
      });

      it("should throw error for invalid authorization payload values", () => {
        const invalidAuth = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          payload: {
            type: "authorization",
            authorization: {
              from: "0x1234",
              to: "0x5678",
              value: "not-a-bigint",
              validAfter: "123",
              validBefore: "456",
              nonce: "0xabc",
              version: "1",
            },
            signature: "0x789",
          },
        };

        const encoded = Buffer.from(JSON.stringify(invalidAuth)).toString("base64");
        expect(() => decodePaymentPayload(encoded)).toThrow();
      });

      it("should throw error for invalid signedTransaction payload values", () => {
        const invalidSignedTx = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          payload: {
            type: "signedTransaction",
            signedTransaction: "missing-0x-prefix",
            signedMessage: "missing-0x",
          },
        };

        const encoded = Buffer.from(JSON.stringify(invalidSignedTx)).toString("base64");
        expect(() => decodePaymentPayload(encoded)).toThrow();
      });

      it("should throw error for invalid signAndSendTransaction payload values", () => {
        const invalidSignAndSend = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          payload: {
            type: "signAndSendTransaction",
            transactionHash: 12345,
            signedMessage: "0x123",
          },
        };

        const encoded = Buffer.from(JSON.stringify(invalidSignAndSend)).toString("base64");
        expect(() => decodePaymentPayload(encoded)).toThrow();
      });

      it("should throw error for unknown payload type", () => {
        const unknownType = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          payload: {
            type: "unknownType",
          },
        };

        const encoded = Buffer.from(JSON.stringify(unknownType)).toString("base64");
        expect(() => decodePaymentPayload(encoded)).toThrow("Invalid payload type");
      });
    });

    describe("edge cases", () => {
      it("should handle payload with optional resource field", () => {
        const payloadWithoutResource: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          payload: {
            type: "signAndSendTransaction",
            transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            signedMessage: "0x1234567890abcdef",
          },
        };

        const encoded = encodePaymentPayload(payloadWithoutResource);
        const decoded = decodePaymentPayload(encoded);

        expect(decoded.resource).toBeUndefined();
      });

      it("should preserve special characters in resource URL", () => {
        const specialResourcePayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource?param=value&other=123#anchor",
          payload: {
            type: "signAndSendTransaction",
            transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            signedMessage: "0x1234567890abcdef",
          },
        };

        const encoded = encodePaymentPayload(specialResourcePayload);
        const decoded = decodePaymentPayload(encoded);

        expect(decoded.resource).toBe(specialResourcePayload.resource);
      });

      it("should handle zero values in authorization", () => {
        const zeroValuePayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "authorization",
            signature: "0x1234567890abcdef",
            authorization: {
              from: "0x1234567890123456789012345678901234567890",
              to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              value: BigInt(0),
              validAfter: BigInt(0),
              validBefore: BigInt(999999999),
              nonce: "0x0000000000000000",
              version: "1",
            },
          },
        };

        const encoded = encodePaymentPayload(zeroValuePayload);
        const decoded = decodePaymentPayload(encoded);

        expect(decoded.payload.type).toBe("authorization");
        if (decoded.payload.type === "authorization") {
          expect(decoded.payload.authorization.value).toBe(BigInt(0));
          expect(decoded.payload.authorization.validAfter).toBe(BigInt(0));
        }
      });
    });

    describe("roundtrip integrity", () => {
      it("should maintain data integrity through multiple encode/decode cycles", () => {
        const originalPayload: EvmPaymentPayload = {
          h402Version: 1,
          scheme: "exact",
          namespace: "evm",
          networkId: "8453",
          resource: "https://example.com/resource",
          payload: {
            type: "authorization",
            signature: "0x1234567890abcdef",
            authorization: {
              from: "0x1234567890123456789012345678901234567890",
              to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              value: BigInt(1000000),
              validAfter: BigInt(1234567890),
              validBefore: BigInt(1234567990),
              nonce: "0xabcdef1234567890",
              version: "1",
            },
          },
        };

        const encoded1 = encodePaymentPayload(originalPayload);
        const decoded1 = decodePaymentPayload(encoded1);

        const encoded2 = encodePaymentPayload(decoded1);
        const decoded2 = decodePaymentPayload(encoded2);

        const encoded3 = encodePaymentPayload(decoded2);
        const decoded3 = decodePaymentPayload(encoded3);

        expect(encoded1).toBe(encoded2);
        expect(encoded2).toBe(encoded3);

        if (decoded1.payload.type === "authorization" && decoded3.payload.type === "authorization") {
          expect(decoded1.payload.authorization.value).toBe(decoded3.payload.authorization.value);
          expect(decoded1.payload.authorization.from).toBe(decoded3.payload.authorization.from);
        }
      });
    });
  });
});

