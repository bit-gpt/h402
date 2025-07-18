import {
  createPublicClient,
  createWalletClient,
  http,
  publicActions,
} from "viem";
import type {
  Chain,
  Transport,
  Client,
  Account,
  RpcSchema,
  PublicActions,
  WalletActions,
  PublicClient,
  LocalAccount,
} from "viem";
import { baseSepolia, avalancheFuji, bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { type Hex } from "viem";
import { EvmNetworkToChainId } from "../network.js";

// Create a public client for reading data
export type SignerWallet<
  chain extends Chain = Chain,
  transport extends Transport = Transport,
  account extends Account = Account
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;

export type ConnectedClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain,
  account extends Account | undefined = undefined
> = PublicClient<transport, chain, account>;

/**
 * Creates a public client based on the provided network ID
 *
 * @param networkId - The network ID to create a client for
 * @returns A public client instance for the specified network
 * @throws Error if the network ID is not supported
 */
export function getPublicClient(
  networkId: string
): ConnectedClient<Transport, any, undefined> {
  switch (networkId) {
    /*
    case EvmNetworkToChainId.get("base")?.toString():
      return createClientSepolia();
    case EvmNetworkToChainId.get("avalanche")?.toString():
      return createClientAvalancheFuji();
    */
    case EvmNetworkToChainId.get("bsc")?.toString():
      return createClientBsc();
    default:
      throw new Error(`Unsupported network ID: ${networkId}`);
  }
}

/**
 * Creates a public client configured for the Base Sepolia testnet
 *
 * @returns A public client instance connected to Base Sepolia
 */
export function createClientSepolia(): ConnectedClient<
  Transport,
  typeof baseSepolia,
  undefined
> {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  }).extend(publicActions);
}

/**
 * Creates a public client configured for the Avalanche Fuji testnet
 *
 * @returns A public client instance connected to Avalanche Fuji
 */
export function createClientAvalancheFuji(): ConnectedClient<
  Transport,
  typeof avalancheFuji,
  undefined
> {
  return createPublicClient({
    chain: avalancheFuji,
    transport: http(),
  }).extend(publicActions);
}

/**
 * Creates a public client configured for the BSC mainnet
 *
 * @returns A public client instance connected to BSC
 */
export function createClientBsc(): ConnectedClient<
  Transport,
  typeof bsc,
  undefined
> {
  return createPublicClient({
    chain: bsc,
    transport: http(),
  }).extend(publicActions);
}

/**
 * Creates a wallet client configured for the Base Sepolia testnet with a private key
 *
 * @param privateKey - The private key to use for signing transactions
 * @returns A wallet client instance connected to Base Sepolia with the provided private key
 */
export function createSignerSepolia(
  privateKey: Hex
): SignerWallet<typeof baseSepolia> {
  return createWalletClient({
    chain: baseSepolia,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  }).extend(publicActions);
}

/**
 * Creates a wallet client configured for the Avalanche Fuji testnet with a private key
 *
 * @param privateKey - The private key to use for signing transactions
 * @returns A wallet client instance connected to Avalanche Fuji with the provided private key
 */
export function createSignerAvalancheFuji(
  privateKey: Hex
): SignerWallet<typeof avalancheFuji> {
  return createWalletClient({
    chain: avalancheFuji,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  }).extend(publicActions);
}

/**
 * Creates a wallet client configured for the BSC mainnet with a private key
 *
 * @param privateKey - The private key to use for signing transactions
 * @returns A wallet client instance connected to BSC with the provided private key
 */
export function createSignerBsc(privateKey: Hex): SignerWallet<typeof bsc> {
  return createWalletClient({
    chain: bsc,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  }).extend(publicActions);
}

/**
 * Checks if a wallet is a signer wallet
 *
 * @param wallet - The wallet to check
 * @returns True if the wallet is a signer wallet, false otherwise
 */
export function isSignerWallet<
  TChain extends Chain = Chain,
  TTransport extends Transport = Transport,
  TAccount extends Account = Account
>(
  wallet: SignerWallet<TChain, TTransport, TAccount> | Account
): wallet is SignerWallet<TChain, TTransport, TAccount> {
  return "chain" in wallet && "transport" in wallet;
}

/**
 * Checks if a wallet is an account
 *
 * @param wallet - The wallet to check
 * @returns True if the wallet is an account, false otherwise
 */
export function isAccount(wallet: SignerWallet | Account): wallet is Account {
  return "address" in wallet && "type" in wallet;
}

export type Wallet = SignerWallet | LocalAccount;
