import {
  EvmAuthorizationParameters,
  EvmSignAndSendTransactionParameters,
  PaymentRequirements,
} from "../../../types";
import { WalletClient, PublicActions, Hex } from "viem";
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

async function signAuthorization(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<EvmAuthorizationParameters, "from" | "to" | "value">,
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
      Math.floor(Date.now() / 1000 + (estimatedProcessingTime ?? 30))
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
      account: from as Hex,
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

async function signTransaction(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<EvmSignAndSendTransactionParameters, "from" | "to" | "value">,
  {
    networkId,
    resource,
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "resource" | "tokenAddress">
): Promise<{ signedTransaction: Hex; messageSignature?: Hex }> {
  try {
    // Sign the resource message (similar to signAndSendTransaction)
    const messageSignature = await client.signMessage({
      account: from as Hex,
      message: resource ?? `402 signature ${Date.now()}`,
    });

    const chain = evm.getChain(networkId);
    const account = from as Hex;

    // Get current gas price and nonce
    const [gasPrice, nonce] = await Promise.all([
      client.getGasPrice(),
      client.getTransactionCount({ address: account }),
    ]);

    let transactionRequest;

    if (tokenAddress === evm.ZERO_ADDRESS) {
      // Native token transfer
      transactionRequest = {
        account,
        to: to as Hex,
        value,
        gasPrice,
        nonce,
        chain,
      };
    } else {
      // ERC20 token transfer
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as Hex, value],
      });

      transactionRequest = {
        account,
        to: tokenAddress as Hex,
        data,
        gasPrice,
        nonce,
        chain,
      };
    }

    // Estimate gas for the transaction
    const gas = await client.estimateGas({
      account,
      to: transactionRequest.to,
      value: transactionRequest.value,
      data: transactionRequest.data,
    });

    const finalTransaction = {
      ...transactionRequest,
      gas,
    };

    console.log("before signTransaction");
    // Sign the transaction without broadcasting
    const signedTransaction = await client.signTransaction(finalTransaction);
    console.log("after signTransaction");

    return {
      signedTransaction,
      messageSignature, // The signed message for the resource
    };
  } catch (error) {
    throw new Error(
      `Failed to sign transaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function signAndSendTransaction(
  client: WalletClient & PublicActions,
  {
    from,
    to,
    value,
  }: Pick<EvmSignAndSendTransactionParameters, "from" | "to" | "value">,
  {
    networkId,
    resource,
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "resource" | "tokenAddress">
): Promise<{ signature: Hex; txHash: Hex }> {
  try {
    const signature = await client.signMessage({
      account: from as Hex,
      message: resource ?? `402 signature ${Date.now()}`,
    });

    if (tokenAddress === evm.ZERO_ADDRESS) {
      const transaction = await client.sendTransaction({
        account: from as Hex,
        to: to as Hex,
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
        args: [to as Hex, value],
      });

      const transaction = await client.sendTransaction({
        account: from as Hex,
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

// Utility function to broadcast a previously signed transaction
async function broadcastSignedTransaction(
  client: WalletClient & PublicActions,
  signedTransaction: Hex
): Promise<{ txHash: Hex }> {
  try {
    const txHash = await client.sendRawTransaction({
      serializedTransaction: signedTransaction,
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== "success") {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    return { txHash };
  } catch (error) {
    throw new Error(
      `Failed to broadcast signed transaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export {
  signAuthorization,
  signAndSendTransaction,
  signTransaction,
  broadcastSignedTransaction
};
