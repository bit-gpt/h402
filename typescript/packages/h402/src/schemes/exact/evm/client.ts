import { WalletClient, PublicActions, Hex } from "viem";
import {
  signResourceMessage,
  signAndSendTransaction,
  signTransaction,
  signAuthorization,
  utils,
} from "./index.js";
import { evm } from "../../../shared/index.js";
import {
  PaymentRequirements,
  EvmPaymentPayload,
} from "../../../types/index.js";

const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    inputs: [...evm.authorizationTypes.TransferWithAuthorization],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function _createPayment(
  client: WalletClient & PublicActions,
  h402Version: number,
  paymentRequirements: PaymentRequirements
): Promise<EvmPaymentPayload> {
  if (!client?.account?.address) {
    throw new Error("Client account is required");
  }

  const from = client.account.address as Hex;
  const to = paymentRequirements.payToAddress as Hex;
  const value = paymentRequirements.amountRequired as bigint;

  const basePayment = {
    h402Version: h402Version,
    scheme: paymentRequirements.scheme!,
    namespace: paymentRequirements.namespace!,
    networkId: paymentRequirements.networkId,
    resource: paymentRequirements.resource!,
  };

  // First try to sign authorization without broadcasting (ERC-3009)
  const hasTransferWithAuthorization = await client
    .readContract({
      address: paymentRequirements.tokenAddress as Hex,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: "transferWithAuthorization",
    })
    .then(() => true)
    .catch(() => false);

  const resourceSignature = await signResourceMessage(
    client,
    from,
    paymentRequirements.resource
  );

  try {
    if (!hasTransferWithAuthorization) {
      throw new Error("ERC-3009 not supported");
    }

    const authorizationResult = await signAuthorization(
      client,
      { from, to, value },
      paymentRequirements
    );

    return {
      ...basePayment,
      payload: {
        type: "authorization",
        signature: authorizationResult.signature,
        authorization: {
          from,
          to,
          value,
          validAfter: authorizationResult.validAfter,
          validBefore: authorizationResult.validBefore,
          nonce: authorizationResult.nonce,
          version: authorizationResult.version,
        },
      },
    };
  } catch {
    try {
      console.log("[Create Payment] SIGN TRANSACTION");
      // Try to sign transaction without broadcasting
      const result = await signTransaction(
        client,
        { from, to, value },
        paymentRequirements
      );

      return {
        ...basePayment,
        payload: {
          type: "signedTransaction",
          signedTransaction: result.signedTransaction,
          signedMessage: resourceSignature,
        },
      };
    } catch {
      console.log("[Create Payment] SIGN AND SEND TRANSACTION");
      const result = await signAndSendTransaction(
        client,
        { from, to, value },
        paymentRequirements
      );

      return {
        ...basePayment,
        payload: {
          type: "signAndSendTransaction",
          signedMessage: resourceSignature,
          transactionHash: result.txHash,
        },
      };
    }
  }
}

async function createPayment(
  client: WalletClient & PublicActions,
  h402Version: number,
  paymentRequirements: PaymentRequirements
): Promise<string> {
  // Set defaults
  let paymentRequirementsWithDefaults = paymentRequirements;
  if (!paymentRequirements.resource) {
    paymentRequirementsWithDefaults.resource = `402 signature ${Date.now()}`;
  }
  if (!paymentRequirements.scheme) {
    paymentRequirementsWithDefaults.scheme = `exact`;
  }
  const payment = await _createPayment(
    client,
    h402Version,
    paymentRequirementsWithDefaults
  );
  return utils.encodePaymentPayload(payment);
}

export { createPayment };
