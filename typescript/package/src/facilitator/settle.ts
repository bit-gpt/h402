import { PublicActions } from "viem";
import { exact } from "../schemes/index.js";
import { parsePaymentDetailsForAmount } from "../shared/parsePaymentDetails.js";
import { PaymentDetails, Hex } from "../types/index.js";
import { utils } from "./index.js";

/**
 * Settles a payment by broadcasting the transaction to the blockchain.
 *
 * @param {string} payload - The encoded payment payload to settle
 * @param {PaymentDetails} paymentDetails - The payment details for the transaction
 * @param {string} privateKey - The private key used to sign and broadcast the transaction
 * @returns {Promise<{ txHash: string } | { errorMessage: string }>} A promise that resolves to either a transaction hash or an error message
 *
 * @description
 * This function handles the settlement process by:
 * 1. Creating a signer client with the provided private key
 * 2. Parsing and validating payment details
 * 3. Decoding the payment payload
 * 4. Delegating to scheme-specific settlement logic
 *
 * @throws Will return an object with errorMessage if settlement fails
 */
async function settle(
  payload: string,
  paymentDetails: PaymentDetails,
  privateKey: string
): Promise<{ txHash: string } | { errorMessage: string }> {
  try {
    if (!privateKey.startsWith("0x")) {
      return { errorMessage: "Invalid private key" };
    }

    const client = utils.createSignerClient(
      paymentDetails.networkId,
      privateKey as Hex
    );

    paymentDetails = await parsePaymentDetailsForAmount(
      paymentDetails,
      client as PublicActions
    );

    const payment = exact.handlers.evm.utils.decodePaymentPayload(payload);

    switch (payment.scheme) {
      case "exact":
        return await exact.handlers.evm.settle(client, payment, paymentDetails);
      default:
        return { errorMessage: "Unsupported scheme" };
    }
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export { settle };
