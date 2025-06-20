import {
  EvmAuthorizationParameters,
  EvmSignAndSendTransactionParameters,
  PaymentRequirements,
} from "../../../types/index.js";
import { stringToHex } from "../../../shared/encoding.js";
import { evm } from "../../../shared/index.js";
import { WalletClient, PublicActions, Hex, encodeFunctionData } from "viem";

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

// Utility function to detect wallet type
function isLocalSigner(client: WalletClient & PublicActions): boolean {
  return !!(client.account && typeof client.account.signMessage === "function");
}

// Unified message signing function
async function signResourceMessage(
  client: WalletClient & PublicActions,
  from: string,
  resource?: string
): Promise<Hex> {
  const messageToSign = resource ?? `402 signature ${Date.now()}`;

  if (isLocalSigner(client)) {
    // Axios interceptor path - use local signing with hex encoding
    const messageHex = `0x${stringToHex(messageToSign)}` as Hex;
    return (await client.account?.signMessage?.({
      message: { raw: messageHex },
    })) as Hex;
  } else {
    // MetaMask path - use client signing
    return await client.signMessage({
      account: from as Hex,
      message: messageToSign,
    });
  }
}

// Utility function to create transaction request
async function createTransactionRequest(
  client: WalletClient & PublicActions,
  from: string,
  to: string,
  value: bigint,
  tokenAddress: string | undefined,
  networkId: string
) {
  const chain = evm.getChain(networkId);
  const account = from as Hex;

  // Get current gas price and nonce in parallel
  const [gasPrice, nonce] = await Promise.all([
    client.getGasPrice(),
    client.getTransactionCount({ address: account }),
  ]);

  let baseRequest;

  if (tokenAddress === evm.ZERO_ADDRESS) {
    // Native token transfer
    baseRequest = {
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

    baseRequest = {
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
    account: baseRequest.account,
    to: baseRequest.to,
    value: baseRequest.value,
    data: baseRequest.data,
  });

  return {
    ...baseRequest,
    gas,
  };
}

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
  }: Pick<
    PaymentRequirements,
    "tokenAddress" | "networkId" | "estimatedProcessingTime"
  >
): Promise<{
  type: "signature";
  signature: Hex;
  nonce: Hex;
  version: string;
  validAfter: bigint;
  validBefore: bigint;
}> {
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
    throw new Error(
      `Failed to sign authorization: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "tokenAddress">
): Promise<{ signedTransaction: Hex }> {
  try {
    // Create transaction request
    const transactionRequest = await createTransactionRequest(
      client,
      from,
      to,
      value,
      tokenAddress,
      networkId
    );

    console.log("Attempting to sign transaction");

    let signedTransaction: Hex;

    if (isLocalSigner(client)) {
      // direct local signing, for Axios interceptor
      signedTransaction = (await client.account?.signTransaction?.(
        transactionRequest
      )) as Hex;
    } else {
      console.log("Not a local signer");
      throw new Error("MetaMask doesn't support sign-only transactions");
    }

    console.log("Transaction signed successfully");

    return {
      signedTransaction,
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
    tokenAddress,
  }: Pick<PaymentRequirements, "networkId" | "tokenAddress">
): Promise<{ txHash: Hex }> {
  try {
    let txHash: Hex;

    if (isLocalSigner(client)) {
      // Local signer, for Axios interceptor path - sign then broadcast
      // Not really supposed to take that path, but kept just in case
      const transactionRequest = await createTransactionRequest(
        client,
        from,
        to,
        value,
        tokenAddress,
        networkId
      );

      // Sign the transaction locally
      const signedTx = await client.signTransaction(transactionRequest);

      // Broadcast the signed transaction
      txHash = await client.sendRawTransaction({
        serializedTransaction: signedTx,
      });
    } else {
      // MetaMask path - direct sendTransaction
      const chain = evm.getChain(networkId);

      if (tokenAddress === evm.ZERO_ADDRESS) {
        txHash = await client.sendTransaction({
          account: from as Hex,
          to: to as Hex,
          value,
          chain,
        });
      } else {
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [to as Hex, value],
        });

        txHash = await client.sendTransaction({
          account: from as Hex,
          to: tokenAddress as Hex,
          data,
          chain,
        });
      }
    }

    // Wait for transaction confirmation
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== "success") {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    return {
      txHash,
    };
  } catch (error) {
    throw new Error(
      `Failed to sign and send transaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export {
  signAuthorization,
  signAndSendTransaction,
  signTransaction,
  signResourceMessage,
};
