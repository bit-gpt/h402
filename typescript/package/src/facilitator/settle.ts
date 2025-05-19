import { PublicActions } from "viem";
import { exact } from "../schemes/index.js";
import { parsePaymentRequirementsForAmount } from "../shared/parsePaymentRequirements.js";
import { PaymentRequirements, Hex } from "../types/index.js";
import { utils } from "./index.js";

/**
 * Settles a payment by broadcasting the transaction to the blockchain.
 *
 * @param {string} payload - The encoded payment payload to settle
 * @param {PaymentRequirements} paymentRequirements - The payment details for the transaction
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
  paymentRequirements: PaymentRequirements,
  privateKey: string
): Promise<{ txHash: string } | { errorMessage: string }> {
  try {
    if (!privateKey.startsWith("0x")) {
      return { errorMessage: "Invalid private key" };
    }

    const client = utils.createSignerClient(
      paymentRequirements.networkId,
      privateKey as Hex
    );

    paymentRequirements = await parsePaymentRequirementsForAmount(
      paymentRequirements,
      client as PublicActions
    );

    const payment = exact.handlers.evm.utils.decodePaymentPayload(payload);

    switch (payment.scheme) {
      case "exact":
        return await exact.handlers.evm.settle(
          client,
          payment,
          paymentRequirements
        );
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
