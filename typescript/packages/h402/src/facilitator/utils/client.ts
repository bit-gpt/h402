import {
  createPublicClient as createViemPublicClient,
  createWalletClient,
  Hex,
  http,
  HttpTransport,
  publicActions,
  PublicActions,
  PublicClient,
  WalletClient as SignerClient,
} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {evm} from "../../shared/index.js";

function getTransport(rpcEnvVariable: string): HttpTransport {
  const rpcUrl = process.env[rpcEnvVariable];
  if (!rpcUrl) {
    return http();
  }
  return http(rpcUrl);
}

function validateChainId(chainId: string): void {
  if (!evm.isChainSupported(chainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

function createPublicClient(chainId: string): PublicClient {
  validateChainId(chainId);

  const rpcEnvVariable = evm.getRPCEnvVariable(chainId);
  const chain = evm.getChain(chainId);
  const transport = getTransport(rpcEnvVariable);

  return createViemPublicClient({
    chain,
    transport,
  }).extend(publicActions);
}

function createSignerClient(
  chainId: string,
  privateKey: Hex
): SignerClient & PublicActions {
  validateChainId(chainId);

  if (!privateKey) {
    throw new Error("Private key is required");
  }

  const rpcEnvVariable = evm.getRPCEnvVariable(chainId);
  const chain = evm.getChain(chainId);
  const transport = getTransport(rpcEnvVariable);
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    chain,
    transport,
    account,
  }).extend(publicActions);
}

export {createPublicClient, createSignerClient};
