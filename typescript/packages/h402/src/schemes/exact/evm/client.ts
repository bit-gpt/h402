import { WalletClient, PublicActions } from "viem";
import { signAndSendTransaction, signAuthorization, utils } from "./index.js";
import { evm } from "../../../shared/index.js";
import { PaymentRequirements, EvmPaymentPayload } from "../../../types";
import { Hex } from "viem";

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

  if (paymentRequirements.tokenAddress === evm.ZERO_ADDRESS) {
    const result = await signAndSendTransaction(
      client,
      { from, to, value },
      paymentRequirements
    );

    return {
      ...basePayment,
      payload: {
        type: "signAndSendTransaction",
        signedMessage: result.signature,
        transactionHash: result.txHash,
      },
    };
  }

  const hasTransferWithAuthorization = await client
    .readContract({
      address: paymentRequirements.tokenAddress as Hex,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: "transferWithAuthorization",
    })
    .then(() => true)
    .catch(() => false);

  if (hasTransferWithAuthorization) {
    const result = await signAuthorization(
      client,
      { from, to, value },
      paymentRequirements
    );

    if (result.type === "fallback") {
      return {
        ...basePayment,
        payload: {
          type: "signAndSendTransaction",
          signedMessage: result.signature,
          transactionHash: result.txHash,
        },
      };
    }

    return {
      ...basePayment,
      payload: {
        type: "authorization",
        signature: result.signature,
        authorization: {
          from,
          to,
          value,
          validAfter: result.validAfter,
          validBefore: result.validBefore,
          nonce: result.nonce,
          version: result.version,
        },
      },
    };
  }

  const result = await signAndSendTransaction(
    client,
    { from, to, value },
    paymentRequirements
  );

  return {
    ...basePayment,
    payload: {
      type: "signAndSendTransaction",
      signedMessage: result.signature,
      transactionHash: result.txHash,
    },
  };
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
