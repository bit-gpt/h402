import { Hex, PaymentRequirements, exact } from "../../../types/index.js";
import { WalletClient, PublicActions } from "viem";
import { evm } from "../../../shared/index.js";
import { encodeFunctionData } from "viem";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

async function signNativeTransfer(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<exact.evm.NativeTransferParameters, "from" | "to" | "value">,
  {
    networkId,
    resource,
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "resource" | "tokenAddress">
): Promise<
  | { type: "signature"; signature: Hex; nonce: number }
  | { type: "fallback"; signature: Hex; txHash: Hex }
> {
  try {
    const request = await client.prepareTransactionRequest({
      account: from,
      to,
      value,
      chain: evm.getChain(networkId),
    });

    const signature = await client.signTransaction({
      ...request,
      account: from,
    });

    return { type: "signature", signature, nonce: request.nonce };
  } catch (error) {
    console.warn(
      "Failed to sign native transfer, falling back to signAndSendTransaction"
    );
    const result = await signAndSendTransaction(
      client,
      { from, to, value },
      { networkId, resource, tokenAddress }
    );
    return { type: "fallback", ...result };
  }
}

async function signTokenTransfer(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<exact.evm.TokenTransferParameters, "from" | "to" | "value">,
  {
    tokenAddress,
    networkId,
    resource,
  }: Pick<PaymentRequirements, "tokenAddress" | "networkId" | "resource">
): Promise<
  | { type: "signature"; signature: Hex; nonce: number; data: Hex }
  | { type: "fallback"; signature: Hex; txHash: Hex }
> {
  try {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, value],
    });

    const request = await client.prepareTransactionRequest({
      account: from,
      to: tokenAddress?.toLowerCase() as Hex,
      data,
      chain: evm.getChain(networkId),
    });

    const signature = await client.signTransaction({
      ...request,
      account: from,
    });

    return { type: "signature", signature, nonce: request.nonce, data };
  } catch (error) {
    console.warn(
      "Failed to sign token transfer, falling back to signAndSendTransaction"
    );
    const result = await signAndSendTransaction(
      client,
      { from, to, value },
      { networkId, resource, tokenAddress }
    );
    return { type: "fallback", ...result };
  }
}

async function signAuthorization(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<exact.evm.AuthorizationParameters, "from" | "to" | "value">,
  {
    tokenAddress,
    networkId,
    estimatedProcessingTime,
    resource,
  }: Pick<
    PaymentRequirements,
    "tokenAddress" | "networkId" | "estimatedProcessingTime" | "resource"
  >
): Promise<
  | {
      type: "signature";
      signature: Hex;
      nonce: Hex;
      version: string;
      validAfter: bigint;
      validBefore: bigint;
    }
  | { type: "fallback"; signature: Hex; txHash: Hex }
> {
  try {
    const nonce = evm.createNonce();
    const validAfter = BigInt(
      Math.floor(Date.now() / 1000) - 5 // 1 block (2s) before to account for block timestamping
    );
    const validBefore = BigInt(
      Math.floor(Date.now() / 1000 + estimatedProcessingTime)
    );
    const { domain } = await client.getEip712Domain({
      address: tokenAddress?.toLowerCase() as Hex,
    });

    const data = {
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: parseInt(networkId),
        verifyingContract: tokenAddress?.toLowerCase() as Hex,
      },
      primaryType: "TransferWithAuthorization" as const,
      message: {
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
      },
    };

    const signature = await client.signTypedData({
      ...data,
      account: from,
    });

    return {
      type: "signature",
      signature,
      nonce,
      version: domain.version,
      validAfter,
      validBefore,
    };
  } catch (error) {
    console.warn(
      "Failed to sign authorization, falling back to signAndSendTransaction"
    );
    const result = await signAndSendTransaction(
      client,
      { from, to, value },
      { networkId, resource, tokenAddress }
    );
    return { type: "fallback", ...result };
  }
}

async function signAndSendTransaction(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<exact.evm.SignAndSendTransactionParameters, "from" | "to" | "value">,
  {
    networkId,
    resource,
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "resource" | "tokenAddress">
): Promise<{ signature: Hex; txHash: Hex }> {
  try {
    const signature = await client.signMessage({
      account: from,
      message: resource,
    });

    if (tokenAddress === evm.ZERO_ADDRESS) {
      const transaction = await client.sendTransaction({
        account: from,
        to,
        value,
        chain: evm.getChain(networkId),
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: transaction,
      });

      if (receipt.status !== "success") {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      return {
        signature,
        txHash: transaction,
      };
    } else {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, value],
      });

      const transaction = await client.sendTransaction({
        account: from,
        to: tokenAddress as Hex,
        data,
        chain: evm.getChain(networkId),
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: transaction,
      });

      if (receipt.status !== "success") {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      return {
        signature,
        txHash: transaction,
      };
    }
  } catch (error) {
    throw new Error(
      `Failed to sign and send transaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { signNativeTransfer, signTokenTransfer, signAuthorization };
