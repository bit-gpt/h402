import { exact } from "../schemes/index.js";
import { PaymentDetails, VerifyResponse } from "../types";
import { PublicActions } from "viem";
import { evm } from "../shared/index.js";
import { utils } from "./index.js";
import { parsePaymentDetailsForAmount } from "../shared/parsePaymentDetails.js";
import { ExactSolanaBroadcastPaymentPayload } from "../types/scheme/exact/solana/index.js";
import { safeBase64Decode } from "../shared/base64.js";

/**
 * Verifies a payment payload against the provided payment details.
 *
 * @param {string} payload - The encoded payment payload to verify
 * @param {PaymentDetails} paymentDetails - The payment details to verify against
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
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    const client = utils.createPublicClient(paymentDetails.networkId);

    paymentDetails = await parsePaymentDetailsForAmount(
      paymentDetails,
      client as PublicActions
    );

    // Use the appropriate handler based on namespace
    switch (paymentDetails.namespace) {
      case "eip155": {
        if (!evm.isChainSupported(paymentDetails.networkId)) {
          return {
            isValid: false,
            errorMessage: "Unsupported namespace or chain",
          };
        }

        const payment = exact.handlers.evm.utils.decodePaymentPayload(payload);

        switch (payment.scheme) {
          case "exact":
            return await exact.handlers.evm.verify(client, payment, paymentDetails);
          default:
            return {
              isValid: false,
              errorMessage: "Unsupported scheme",
            };
        }
      }
      case "solana": {
        try {
          // Decode the base64 payload
          const decodedPayload = safeBase64Decode(payload);
          const paymentPayload = JSON.parse(decodedPayload) as ExactSolanaBroadcastPaymentPayload;

          // Verify the scheme
          if (paymentPayload.scheme !== "exact") {
            return {
              isValid: false,
              errorMessage: "Unsupported scheme for Solana",
            };
          }

          // Delegate to the Solana-specific verification handler
          return await exact.handlers.solana.verify(paymentPayload, paymentDetails);
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
