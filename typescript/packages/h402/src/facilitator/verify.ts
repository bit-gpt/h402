import { exact } from "../schemes/index.js";
import {
  PaymentRequirements,
  VerifyResponse,
} from "../types";
import { PublicActions } from "viem";
import { evm } from "../shared/index.js";
import { utils } from "./index.js";
import { parsePaymentRequirementsForAmount } from "../shared/parsePaymentRequirements.js";
import { safeBase64Decode } from "../shared";

/**
 * Verifies a payment payload against the provided payment details.
 *
 * @param {string} payload - The encoded payment payload to verify
 * @param {PaymentRequirements} paymentRequirements - The payment details to verify against
 * @returns {Promise<VerifyResponse>} A promise that resolves to the verification result
 *
 * @description
 * This function performs several verification steps:
 * 1. Creates a public client for the specified network
 * 2. Parses and validates payment details
 * 3. Decodes the payment payload
 * 4. Verifies the namespace and chain support
 * 5. Delegates to scheme-specific verification
 *
 * @throws Will return a VerifyResponse with isValid: false and an error message if verification fails
 */
async function verify(
  payload: string,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    const decodedPayload = safeBase64Decode(payload);
    const paymentPayload = JSON.parse(decodedPayload);
    let payloadNamespace = paymentPayload.namespace;

    switch (payloadNamespace) {
      case "evm": {
        console.log("[DEBUG-PAYMENT-FLOW] Verifying EVM payload");
        if (!evm.isChainSupported(paymentRequirements.networkId)) {
          return {
            isValid: false,
            errorMessage: "Unsupported namespace or chain",
          };
        }

        const payment = exact.handlers.evm.utils.decodePaymentPayload(payload);

        const client = utils.createPublicClient(paymentRequirements.networkId);

        paymentRequirements = await parsePaymentRequirementsForAmount(
          paymentRequirements,
          client as PublicActions
        );

        switch (payment.scheme) {
          case "exact":
            return await exact.handlers.evm.verify(
              client,
              payment,
              paymentRequirements
            );
          default:
            return {
              isValid: false,
              errorMessage: "Unsupported scheme",
            };
        }
      }
      case "solana": {
        console.log("[DEBUG-PAYMENT-FLOW] Verifying Solana payload");
        try {
          if (paymentPayload.scheme !== "exact") {
            return {
              isValid: false,
              errorMessage: "Unsupported scheme for Solana",
            };
          }

          // Delegate to the Solana-specific verification handler
          return await exact.handlers.solana.verify(
            paymentPayload,
            paymentRequirements
          );
        } catch (error) {
          return {
            isValid: false,
            errorMessage: `Error decoding Solana payload: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      }
      default:
        console.log("[DEBUG-PAYMENT-FLOW] Unsupported namespace");
        return {
          isValid: false,
          errorMessage: "Unsupported namespace",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export { verify };
