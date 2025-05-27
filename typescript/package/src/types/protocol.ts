export type BlockchainType = "evm" | "solana";

export type AmountFormat = "humanReadable" | "smallestUnit";

/**
 * Base payment requirements type used when creating payment requirements.
 * Token metadata (decimals, symbol) are optional as they will be enriched by the middleware.
 */
export type BasePaymentRequirements = {
  namespace: BlockchainType;
  tokenAddress: string; // Token address or special value for native tokens
  tokenDecimals?: number;
  tokenSymbol?: string;
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

/**
 * Enriched payment requirements type returned by the middleware.
 * Token metadata (decimals, symbol) are guaranteed to be present.
 */
export type EnrichedPaymentRequirements = Omit<
  BasePaymentRequirements,
  "tokenDecimals" | "tokenSymbol"
> & {
  tokenDecimals: number; // Required after enrichment
  tokenSymbol: string; // Required after enrichment
};

// Default export type is the base type for backward compatibility
export type PaymentRequirements = BasePaymentRequirements;

export type RouteConfig = {
  paymentRequirements: PaymentRequirements[];
};

export type MiddlewareConfig = {
  routes: Record<string, RouteConfig>;
  facilitatorUrl?: string;
};

export type PaymentRequired = {
  // Version of the h402 payment protocol
  version: number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentRequirements[];
  // Message for error(s) that occured while processing payment
  error: string | null;
};

export type PaymentPayload<T> = {
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
