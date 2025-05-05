import { PublicActions, WalletClient } from "viem";
import { PaymentDetails } from "../types";
import { evm, solana } from "../shared/index.js";
import { exact } from "../schemes/index.js";
import { parsePaymentDetailsForAmount } from "../shared/parsePaymentDetails.js";
import { safeBase64Encode } from "../shared";
import { PaymentClient, CreatePaymentFunction } from "../types/payment.js";

/**
 * Creates a payment based header on the provided payment details and client.
 *
 * @param {PaymentDetails} paymentDetails - The details of the payment to be created
 * @param {PaymentClient} client - The client object containing chain-specific clients
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
 * 2. For EIP-155 (EVM) payments:
 *    - Verifies network support
 *    - Validates client configuration
 *    - Ensures chain ID matches
 *    - Processes the payment based on the specified scheme
 * 3. Encodes and returns the payment data
 */
const createPayment: CreatePaymentFunction = async (
  paymentDetails: PaymentDetails,
  client: PaymentClient
): Promise<string> => {
  if (!paymentDetails.namespace) {
    throw new Error("Payment details namespace is required");
  }

  paymentDetails = await parsePaymentDetailsForAmount(
    paymentDetails,
    client.evmClient as PublicActions
  );

  switch (paymentDetails.namespace) {
    case "eip155": {
      if (!Object.keys(evm.chains).includes(paymentDetails.networkId)) {
        throw new Error(`Unsupported EVM Network: ${paymentDetails.networkId}`);
      }
      if (!client.evmClient) {
        throw new Error("evmClient is required for EIP-155 payments");
      }
      if (client.evmClient.chain?.id.toString() !== paymentDetails.networkId) {
        throw new Error(
          `EVM client chainId doesn't match payment networkId: ${paymentDetails.networkId}`
        );
      }
      switch (paymentDetails.scheme) {
        case "exact":
          return await exact.handlers.evm.createPayment(
            client.evmClient,
            paymentDetails
          );
        default:
          throw new Error(`Unsupported scheme: ${paymentDetails.scheme}`);
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

      if (!client.solanaClient.signAndSendTransaction) {
        throw new Error(
          "solanaClient.signAndSendTransaction is required for Solana payments"
        );
      }

      if (!solana.isSolanaSupported(paymentDetails.networkId)) {
        throw new Error(
          `Unsupported Solana Network: ${paymentDetails.networkId}`
        );
      }

      switch (paymentDetails.scheme) {
        case "exact": {
          console.log("createPayment paymentDetails", paymentDetails);

          // Create a complete solanaClient object that includes the RPC
          const solanaClientWithRpc = {
            ...client.solanaClient,
            rpc: client.solanaClient.rpc, // Include the RPC in the client object
          };

          if (client.solanaClient.rpc) {
            console.log("Using provided proxied Solana RPC client");
          } else {
            console.log(
              "No proxied RPC provided, will use default in Solana client"
            );
          }

          // Use the dedicated Solana createPayment function with the enhanced client
          return exact.handlers.solana.createPayment(
            solanaClientWithRpc,
            paymentDetails
          );
        }
        default:
          throw new Error(
            `Unsupported scheme for Solana: ${paymentDetails.scheme}`
          );
      }
    }
    default:
      throw new Error(`Unsupported namespace: ${paymentDetails.namespace}`);
  }
};

export { createPayment };
