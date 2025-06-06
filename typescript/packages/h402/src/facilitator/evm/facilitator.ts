import { verify as verifyExact, settle as settleExact } from "../../schemes/exact/evm";
import { ConnectedClient, SignerWallet } from "../../types/shared/evm";
import {
  SupportedEVMNetworks,
  EvmPaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse, EvmNetworkToChainId, isSupportedEVMNetworkId,
} from "../../types";
import { Chain, Transport, Account } from "viem";

/**
 * Verifies a payment payload against the required payment details regardless of the scheme
 * this function wraps all verify functions for each specific scheme
 *
 * @param client - The public client used for blockchain interactions
 * @param payload - The signed payment payload containing transfer parameters and signature
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @returns A ValidPaymentRequest indicating if the payment is valid and any invalidation reason
 */
export async function verify<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined,
>(
  client: ConnectedClient<transport, chain, account>,
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  if (
    paymentRequirements.scheme == "exact" &&
    isSupportedEVMNetworkId(paymentRequirements.networkId)
  ) {
    const valid = await verifyExact(client, payload, paymentRequirements);
    return valid;
  }
  return {
    isValid: false,
    invalidReason: "invalid_scheme",
    // payer: payload.payload.authorization.from,
  };
}

/**
 * Settles a payment payload against the required payment details regardless of the scheme
 * this function wraps all settle functions for each specific scheme
 *
 * @param client - The signer wallet used for blockchain interactions
 * @param payload - The signed payment payload containing transfer parameters and signature
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @returns A SettleResponse indicating if the payment is settled and any settlement reason
 */
export async function settle<transport extends Transport, chain extends Chain>(
  client: SignerWallet<chain, transport>,
  payload: EvmPaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  if (
    paymentRequirements.scheme == "exact" &&
    isSupportedEVMNetworkId(paymentRequirements.networkId)
  ) {
    return settleExact(client, payload, paymentRequirements);
  }

  return {
    success: false,
    errorReason: "invalid_scheme",
    transaction: "",
    namespace: paymentRequirements.namespace,
    // payer: payload.payload.authorization.from,
  };
}

export type Supported = {
  x402Version: number;
  kind: {
    scheme: string;
    networkId: string;
  }[];
};
