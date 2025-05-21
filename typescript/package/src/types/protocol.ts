type BlockchainType = "evm" | "solana";

type AmountFormat = "humanReadable" | "smallestUnit";

type PaymentRequirements = {
  namespace: BlockchainType;
  tokenAddress: string; // Token address or special value for native tokens
  tokenType: string;
  tokenDecimals: number;
  tokenSymbol: string;
  amountRequired: bigint | number;
  amountRequiredFormat: AmountFormat;
  payToAddress: string;
  networkId: string; // Chain ID for EVM, cluster name for Solana
  description?: string;
  resource?: string;
  scheme?: string;
  mimeType?: string;
  outputSchema?: any;
  estimatedProcessingTime?: number;
  extra?: any;
  maxAmountRequired?: bigint | number;
  requiredDeadlineSeconds?: number;
};

type RouteConfig = {
  paymentRequirements: PaymentRequirements[];
};

type MiddlewareConfig = {
  routes: Record<string, RouteConfig>;
  facilitatorUrl?: string;
  paywallRoute?: string;
};

type PaymentRequired = {
  // Version of the h402 payment protocol
  version: number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentRequirements[];
  // Message for error(s) that occured while processing payment
  error: string | null;
};

type PaymentPayload<T> = {
  // Version of the h402 payment protocol
  version: number;
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Netowrk of the blockchain to send payment on
  networkId: string;
  // Payload of the payment protocol
  payload: T;
  // Identifier of what the user pays for
  resource: string;
};

export {
  PaymentRequirements,
  PaymentRequired,
  PaymentPayload,
  AmountFormat,
  BlockchainType,
  RouteConfig,
  MiddlewareConfig,
};
