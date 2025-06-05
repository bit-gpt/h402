import {PublicActions} from "viem";
import {PaymentRequirements} from "../types";
import {evm, solana} from "../shared/index.js";
import {exact} from "../schemes/index.js";
import {parsePaymentRequirementsForAmount} from "../shared/parsePaymentRequirements.js";
import { PaymentClient } from "../types";

/**
 * Creates a payment based header on the provided payment details and client.
 *
 * @param {PaymentRequirements} paymentRequirements - The details of the payment to be created
 * @param {PaymentClient} client - The client object containing chain-specific clients
 * @param h402Version
 * @returns {Promise<string>} A promise that resolves to the payment header
 *
 * @throws {Error} If payment details namespace is missing
 * @throws {Error} If the specified EVM network is not supported
 * @throws {Error} If evmClient is missing for EIP-155 payments
 * @throws {Error} If EVM client chainId doesn't match payment networkId
 * @throws {Error} If solanaClient is missing for Solana payments
 * @throws {Error} If the namespace is not supported
 * @throws {Error} If the payment scheme is not supported
 *
 * @description
 * This function handles the payment creation process by:
 * 1. Validating the payment namespace
 * 2.1 For EIP-155 (EVM) payments:
 *    - Verifies network support
 *    - Validates client configuration
 *    - Ensures chain ID matches
 *    - Processes the payment based on the specified scheme
 * 2.2 For Solana payments:
 *    - Verifies network support
 *    - Validates client configuration
 *    - Ensures signAndSendTransaction is available
 *    - Processes the payment based on the specified scheme
 * 3. Encodes and returns the payment data
 */
export async function createPaymentHeader(
  client: PaymentClient,
  h402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  if (!paymentRequirements.namespace) {
    throw new Error("Payment details namespace is required");
  }

  // Conditionally use the appropriate client based on the payment namespace
  if (paymentRequirements.namespace === "solana") {
    paymentRequirements = await parsePaymentRequirementsForAmount(
      paymentRequirements,
    );
  } else {
    // Default to EVM client for EVM payments
    if (!client.evmClient) {
      throw new Error("evmClient is required for EVM payments");
    }
    paymentRequirements = await parsePaymentRequirementsForAmount(
      paymentRequirements,
      client.evmClient as PublicActions
    );
  }

  switch (paymentRequirements.namespace) {
    case "evm": {
      if (!Object.keys(evm.chains).includes(paymentRequirements.networkId)) {
        throw new Error(
          `Unsupported EVM Network: ${paymentRequirements.networkId}`
        );
      }
      if (!client.evmClient) {
        throw new Error("evmClient is required for EVM payments");
      }
      if (
        client.evmClient.chain?.id.toString() !== paymentRequirements.networkId
      ) {
        throw new Error(
          `EVM client chainId doesn't match payment networkId: ${paymentRequirements.networkId}`
        );
      }
      switch (paymentRequirements.scheme) {
        case "exact":
          return await exact.handlers.evm.createPayment(
            client.evmClient,
            h402Version,
            paymentRequirements
          );
        default:
          throw new Error(`Unsupported scheme: ${paymentRequirements.scheme}`);
      }
    }
    case "solana": {
      if (!client.solanaClient) {
        throw new Error("solanaClient is required for Solana payments");
      }

      if (!client.solanaClient.publicKey) {
        throw new Error(
          "solanaClient.publicKey is required for Solana payments"
        );
      }

      switch (paymentRequirements.scheme) {
        case "exact": {
          // Use the dedicated Solana createPayment function with the enhanced client
          return exact.handlers.solana.createPayment(
            client.solanaClient,
            h402Version,
            paymentRequirements
          );
        }
        default:
          throw new Error(
            `Unsupported scheme for Solana: ${paymentRequirements.scheme}`
          );
      }
    }
    default:
      throw new Error(
        `Unsupported namespace: ${paymentRequirements.namespace}`
      );
  }
}
