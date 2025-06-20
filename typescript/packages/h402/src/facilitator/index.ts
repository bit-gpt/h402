/**
 * Export all facilitator implementations
 * This file serves as a central export point for all blockchain-specific facilitators
 * and provides a unified interface for easier use
 */

// Import blockchain-specific facilitators
import * as evmFacilitator from "./evm/facilitator.js";
import * as solanaFacilitator from "./solana/facilitator.js";

// Re-export the specific implementations
export * as evm from "./evm/facilitator.js";
export * as solana from "./solana/facilitator.js";

// Import types
import {
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
  EvmPaymentPayload,
  SolanaPaymentPayload,
  ChainIdToEvmNetwork,
} from "../types";
import { EvmClient, SolanaClient } from "../types/shared/client";
import { createWalletClient, http, publicActions, PublicClient } from "viem";
import { getPublicClient } from "../types/shared/evm/wallet.js";
import { privateKeyToAccount } from "viem/accounts";
import { getChain } from "../shared/evm/chainUtils.js";

/**
 * Type representing any supported payment payload
 */
export type PaymentPayload = EvmPaymentPayload | SolanaPaymentPayload;

/**
 * Type representing any supported client
 */
export type Client = EvmClient | SolanaClient | PublicClient;

/**
 * Verifies a payment payload against the required payment details
 * Automatically detects the appropriate blockchain implementation
 *
 * @param payload - The signed payment payload
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @param client - Optional client used for blockchain interactions (required for EVM)
 * @returns A VerifyResponse indicating if the payment is valid and any invalidation reason
 */
export async function verify(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  // Route to the appropriate blockchain implementation based on namespace
  if (paymentRequirements.namespace === "solana") {
    return solanaFacilitator.verify(
      payload as SolanaPaymentPayload,
      paymentRequirements
    );
  } else {
    const client = getPublicClient(paymentRequirements.networkId);
    return evmFacilitator.verify(
      client as PublicClient,
      payload as EvmPaymentPayload,
      paymentRequirements
    );
  }
}

/**
 * Settles a payment payload against the required payment details
 * Automatically detects the appropriate blockchain implementation
 *
 * @param payload - The signed payment payload
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @param privateKeyOrClient - Private key (for EVM) or client (for Solana)
 * @returns A SettleResponse indicating if the payment is settled and any settlement reason
 */
export async function settle(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  privateKeyOrClient: string | Client
): Promise<SettleResponse> {
  // Route to the appropriate blockchain implementation based on namespace
  if (paymentRequirements.namespace === "solana") {
    return solanaFacilitator.settle(
      privateKeyOrClient as SolanaClient,
      payload as SolanaPaymentPayload,
      paymentRequirements
    );
  } else {
    const account = privateKeyToAccount(privateKeyOrClient as `0x${string}`);
    const chain = getChain(paymentRequirements.networkId);
    const client = createWalletClient({
      account,
      transport: http(),
      chain,
    }).extend(publicActions);

    return evmFacilitator.settle(
      client,
      payload as EvmPaymentPayload,
      paymentRequirements
    );
  }
}

/**
 * Get supported payment schemes and networks for all implementations
 *
 * @returns Object containing supported schemes and networks for each blockchain
 */
export function getSupported(): {
  evm: evmFacilitator.Supported;
  solana: solanaFacilitator.Supported;
} {
  return {
    evm: {
      h402Version: 1,
      kind: [{ scheme: "exact", networkId: "evm" }],
    },
    solana: {
      h402Version: 1,
      kind: [{ scheme: "exact", networkId: "solana" }],
    },
  };
}
