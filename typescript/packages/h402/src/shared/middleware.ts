import { safeBase64Decode } from "./base64.js";
import { Address, Hex } from "viem";
import {
  Network,
  PaymentRequirements,
  EvmPaymentPayload,
  SolanaPaymentPayload,
  Price,
  ERC20TokenAmount,
  moneySchema,
  RoutePattern,
  RoutesConfig,
  RouteConfig,
} from "../types/index.js";
import { getNetworkId } from "./network.js";
import { STABLECOIN_ADDRESSES } from "../types/shared/tokens.js";

/**
 * Computes the route patterns for the given routes config
 *
 * @param routes - The routes config to compute the patterns for
 * @returns The route patterns
 */
export function computeRoutePatterns(routes: RoutesConfig): RoutePattern[] {
  const normalizedRoutes = Object.fromEntries(
    Object.entries(routes).map(([pattern, value]) => [
      pattern,
      typeof value === "string" || typeof value === "number"
        ? createRouteConfigFromPrice(value, "bsc")
        : (value as RouteConfig),
    ])
  );

  return Object.entries(normalizedRoutes).map(([pattern, routeConfig]) => {
    // Split pattern into verb and path, defaulting to "*" for verb if not specified
    const [verb, path] = pattern.includes(" ")
      ? pattern.split(/\s+/)
      : ["*", pattern];
    if (!path) {
      throw new Error(`Invalid route pattern: ${pattern}`);
    }
    return {
      verb: verb.toUpperCase(),
      pattern: new RegExp(
        `^${path
          .replace(/\*/g, ".*?") // Make wildcard non-greedy and optional
          .replace(/\[([^\]]+)\]/g, "[^/]+")
          .replace(/\//g, "\\/")}$`,
        "i"
      ),
      config: routeConfig,
    };
  });
}

/**
 * Finds the matching route pattern for the given path and method
 *
 * @param routePatterns - The route patterns to search through
 * @param path - The path to match against
 * @param method - The HTTP method to match against
 * @returns The matching route pattern or undefined if no match is found
 */
export function findMatchingRoute(
  routePatterns: RoutePattern[],
  path: string,
  method: string
): RoutePattern | undefined {
  // Find matching route pattern
  const matchingRoutes = routePatterns.filter(({ pattern, verb }) => {
    const matchesPath = pattern.test(path);
    const matchesVerb = verb === "*" || verb === method.toUpperCase();
    return matchesPath && matchesVerb;
  });

  if (matchingRoutes.length === 0) {
    return undefined;
  }

  // Use the most specific route (longest path pattern)
  const matchingRoute = matchingRoutes.reduce((a, b) =>
    b.pattern.source.length > a.pattern.source.length ? b : a
  );

  return matchingRoute;
}

/**
 * Gets the default asset (USDC/USDT) for the given network
 *
 * @param network - The network to get the default asset for
 * @returns The default asset
 */
export function getDefaultAsset(network: Network) {
  const networkId = getNetworkId(network);
  const address = getUsdcAddressForChain(networkId);

  return {
    address: address as `0x${string}`, // Type assertion for compatibility
    decimals: 6,
    eip712: {
      name:
        network === "bsc"
          ? "Tether USD"
          : network === "solana"
          ? "USD Coin"
          : "USDC",
      version: "2",
    },
  };
}

/**
 * Parses the amount from the given price
 *
 * @param price - The price to parse
 * @param network - The network to get the default asset for
 * @returns The parsed amount or an error message
 */
export function processPriceToAtomicAmount(
  price: Price,
  network: Network
):
  | { maxAmountRequired: string; asset: ERC20TokenAmount["asset"] }
  | { error: string } {
  // Handle USDC amount (string) or token amount (ERC20TokenAmount)
  let maxAmountRequired: string;
  let asset: ERC20TokenAmount["asset"];

  if (typeof price === "string" || typeof price === "number") {
    // USDC amount in dollars
    const parsedAmount = moneySchema.safeParse(price);
    if (!parsedAmount.success) {
      return {
        error: `Invalid price (price: ${price}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`,
      };
    }
    const parsedUsdAmount = parsedAmount.data;
    asset = getDefaultAsset(network);
    maxAmountRequired = (parsedUsdAmount * 10 ** asset.decimals).toString();
  } else {
    // Token amount in atomic units
    maxAmountRequired = price.amount;
    asset = price.asset;
  }

  return {
    maxAmountRequired,
    asset,
  };
}

/**
 * Finds the matching payment requirements for the given payment
 *
 * @param paymentRequirements - The payment requirements to search through
 * @param payment - The payment to match against
 * @returns The matching payment requirements or undefined if no match is found
 */
export function findMatchingPaymentRequirements(
  paymentRequirements: PaymentRequirements[],
  payment: EvmPaymentPayload | SolanaPaymentPayload
) {
  return paymentRequirements.find(
    (value) =>
      value.scheme === payment.scheme && value.networkId === payment.networkId
  );
}

/**
 * Decodes the X-PAYMENT-RESPONSE header
 *
 * @param header - The X-PAYMENT-RESPONSE header to decode
 * @returns The decoded payment response
 */
export function decodeXPaymentResponse(header: string) {
  const decoded = safeBase64Decode(header);
  return JSON.parse(decoded) as {
    success: boolean;
    transaction: Hex;
    network: Network;
    payer: Address;
  };
}

/**
 * Creates a RouteConfig from a price and network
 *
 * @param price - The price to create the RouteConfig from
 * @param network - The network to create the RouteConfig for
 * @returns The created RouteConfig
 */
export function createRouteConfigFromPrice(
  price: Price,
  network: Network
): RouteConfig {
  const processedPrice = processPriceToAtomicAmount(price, network);

  if ("error" in processedPrice) {
    throw new Error(processedPrice.error);
  }

  const { maxAmountRequired, asset } = processedPrice;

  // Create a basic PaymentRequirements object
  const paymentRequirements: PaymentRequirements = {
    scheme: "exact",
    namespace: network === "solana" ? "solana" : "evm",
    resource: "" as any, // Will be filled in by the middleware
    description: `Payment required (${network})`,
    mimeType: "application/json",
    payToAddress: "0x0000000000000000000000000000000000000000" as any, // Will be filled in by the middleware
    tokenAddress: asset.address as any,
    outputSchema: null,
    extra: asset.eip712,
    amountRequired: Number(maxAmountRequired),
    amountRequiredFormat: "smallestUnit",
    networkId: getNetworkId(network).toString(),
  };

  return {
    paymentRequirements: [paymentRequirements],
  };
}

/**
 * Gets the USDC/USDT address for a given chain ID
 *
 * @param chainId - The chain ID (for EVM networks) or network identifier
 * @returns The stablecoin token address for the chain
 */
export function getUsdcAddressForChain(chainId: number | string): string {
  // BSC mainnet (chain ID 56) uses USDT
  if (chainId === 56) {
    return STABLECOIN_ADDRESSES.USDT_BSC;
  }
  // For Solana (no numeric chain ID), use USDC
  if (chainId === "mainnet") {
    return STABLECOIN_ADDRESSES.USDC_SOLANA;
  }
  // Default to BSC USDT for unknown chains
  return STABLECOIN_ADDRESSES.USDT_BSC;
}
