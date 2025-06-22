import type { Context } from "hono";
import { Address, getAddress } from "viem";
import { utils as evmUtils } from "@bit-gpt/h402/schemes/exact/evm";
import { utils as solanaUtils } from "@bit-gpt/h402/schemes/exact/solana";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  paywallHtml,
  toJsonSafe,
} from "@bit-gpt/h402/shared";
import {
  FacilitatorConfig,
  EvmPaymentPayload,
  SolanaPaymentPayload,
  Resource,
  settleResponseHeader,
  RoutesConfig,
} from "@bit-gpt/h402/types";
import { useFacilitator } from "@bit-gpt/h402/verify";
import { VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";

/**
 * Creates a payment middleware factory for Hono
 *
 * @param payTo - The address to receive payments
 * @param routes - Configuration for protected routes and their payment requirements
 * @param facilitator - Optional configuration for the payment facilitator service
 * @returns A Hono middleware handler
 *
 * @example
 * ```typescript
 * // Simple configuration - All endpoints protected by $0.01 USDT on BSC
 * app.use(paymentMiddleware(
 *   '0x123...', // payTo address
 *   {
 *     '*': '$0.01' // All routes protected by $0.01 USDT on BSC
 *   }
 * ));
 *
 * // Advanced configuration - Multiple payment options per route
 * app.use(paymentMiddleware(
 *   '0x123...', // payTo address
 *   {
 *     '/weather/*': '$0.001', // Simple price for weather endpoints
 *     '/premium/*': {
 *       paymentRequirements: [
 *         {
 *           scheme: "exact",
 *           namespace: "evm",
 *           tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
 *           amountRequired: 0.01,
 *           amountRequiredFormat: "humanReadable",
 *           networkId: "56",
 *           payToAddress: "0x123...",
 *           description: "Premium API access with USDT on BSC"
 *         },
 *         {
 *           scheme: "exact",
 *           namespace: "solana",
 *           tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
 *           amountRequired: 0.01,
 *           amountRequiredFormat: "humanReadable",
 *           networkId: "mainnet",
 *           payToAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
 *           description: "Premium API access with USDC on Solana"
 *         }
 *       ]
 *     }
 *   }
 * ));
 * ```
 */
export function paymentMiddleware(
  payTo: Address,
  routes: RoutesConfig,
  facilitator?: FacilitatorConfig,
) {
  const { verify, settle } = useFacilitator(facilitator);
  const h402Version = 1;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return async function paymentMiddleware(c: Context, next: () => Promise<void>) {
    const matchingRoute = findMatchingRoute(routePatterns, c.req.path, c.req.method.toUpperCase());
    if (!matchingRoute) {
      return next();
    }

    // Get payment requirements from the route config
    const paymentRequirements = matchingRoute.config.paymentRequirements;
    if (!paymentRequirements || paymentRequirements.length === 0) {
      return next();
    }

    // Use the first payment requirement as the primary one
    const primaryRequirement = paymentRequirements[0];
    const resourceUrl: Resource = (primaryRequirement.resource || c.req.url) as Resource;

    // Update the resource URL in all payment requirements and validate addresses
    const updatedPaymentRequirements = paymentRequirements.map(req => {
      let validatedPayToAddress: string;

      if (req.namespace === "evm") {
        // Use viem's getAddress for EVM address validation and checksumming
        validatedPayToAddress = getAddress(payTo);
      } else if (req.namespace === "solana") {
        // Basic Solana address validation
        if (typeof payTo !== "string" || payTo.length < 32 || payTo.length > 44) {
          throw new Error("Invalid Solana address format");
        }
        // Additional validation could be added here using @solana/web3.js
        validatedPayToAddress = payTo;
      } else {
        throw new Error(`Unsupported namespace: ${req.namespace}`);
      }

      return {
        ...req,
        resource: resourceUrl,
        payToAddress: validatedPayToAddress,
      };
    });

    // Determine namespace from payment header if available, otherwise use primary requirement
    let detectedNamespace = primaryRequirement.namespace;
    const payment = c.req.header("X-PAYMENT");

    // If payment is provided, try to detect namespace from the payment structure
    if (payment) {
      try {
        // Try to decode as base64 and check the structure
        const decoded = JSON.parse(atob(payment));
        if (decoded.namespace) {
          detectedNamespace = decoded.namespace;
        }
      } catch {
        // If decoding fails, fall back to primary requirement namespace
      }
    }

    const namespace = detectedNamespace;

    const userAgent = c.req.header("User-Agent") || "";
    const acceptHeader = c.req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      if (isWebBrowser) {
        // Calculate display amount from the payment requirements
        let displayAmount: number;
        if (primaryRequirement.amountRequiredFormat === "humanReadable") {
          displayAmount = Number(primaryRequirement.amountRequired);
        } else {
          // Convert from atomic units to human readable
          const decimals = primaryRequirement.tokenDecimals || 6; // Default to USDC decimals
          displayAmount = Number(primaryRequirement.amountRequired) / 10 ** decimals;
        }

        // Inject the payment requirements data
        const injectScript = `<script>window.h402 = { paymentRequirements: ${JSON.stringify(updatedPaymentRequirements)} }</script>`;

        // Insert the script right before the closing </head> tag
        const html = paywallHtml.replace("</head>", `${injectScript}</head>`);
        return c.html(html, 402);
      }
      return c.json(
        {
          error: "X-PAYMENT header is required",
          accepts: updatedPaymentRequirements,
          h402Version,
        },
        402,
      );
    }

    // Verify payment
    let decodedPayment: EvmPaymentPayload | SolanaPaymentPayload;
    try {
      if (namespace === "evm") {
        decodedPayment = evmUtils.decodePaymentPayload(payment);
      } else if (namespace === "solana") {
        decodedPayment = solanaUtils.decodePaymentPayload(payment);
      } else {
        throw new Error(`Unsupported namespace: ${namespace}`);
      }
      decodedPayment.h402Version = h402Version;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid or malformed payment header";
      console.error(
        `[h402-hono] Payment decoding failed for namespace ${namespace}:`,
        errorMessage,
      );

      return c.json(
        {
          error: errorMessage,
          accepts: updatedPaymentRequirements,
          h402Version,
        },
        402,
      );
    }

    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      updatedPaymentRequirements,
      decodedPayment,
    );

    console.log("paymentMiddleware selectedPaymentRequirements", selectedPaymentRequirements);

    if (!selectedPaymentRequirements) {
      console.error(`[h402-hono] No matching payment requirements found for:`, {
        scheme: decodedPayment.scheme,
        namespace: decodedPayment.namespace,
        networkId: decodedPayment.networkId,
        availableRequirements: updatedPaymentRequirements.map(req => ({
          scheme: req.scheme,
          namespace: req.namespace,
          networkId: req.networkId,
        })),
      });

      return c.json(
        {
          error: "Unable to find matching payment requirements",
          accepts: toJsonSafe(updatedPaymentRequirements),
          h402Version,
        },
        402,
      );
    }

    const verification: VerifyResponse = await verify(payment, selectedPaymentRequirements);

    console.log("paymentMiddleware verification", verification);

    if (!verification.isValid) {
      return c.json(
        {
          error: new Error(verification.invalidReason),
          accepts: updatedPaymentRequirements,
          payer: verification.payer,
          h402Version,
        },
        402,
      );
    }

    // Proceed with request
    await next();

    let res = c.res;

    // If the response from the protected route is >= 400, do not settle payment
    if (res.status >= 400) {
      return;
    }

    c.res = undefined;

    // Settle payment before processing the request, as Hono middleware does not allow us to set headers after the response has been sent
    try {
      console.log(
        "paymentMiddleware attempting settlement with:",
        JSON.stringify({ payment, selectedPaymentRequirements }, null, 2),
      );
      const settlement: SettleResponse = await settle(payment, selectedPaymentRequirements);
      console.log("paymentMiddleware settlement", settlement);

      if (settlement.success) {
        const responseHeader = settleResponseHeader(settlement);
        res.headers.set("X-PAYMENT-RESPONSE", responseHeader);
      } else {
        console.log("paymentMiddleware settlement failed, settlement:", settlement);
        throw new Error(settlement.error || "Settlement failed with undefined data");
      }
    } catch (error) {
      console.log("paymentMiddleware settlement error:", error);
      res = c.json(
        {
          error: error instanceof Error ? error : new Error("Failed to settle payment"),
          accepts: updatedPaymentRequirements,
          h402Version,
        },
        402,
      );
    }

    c.res = res;
  };
}

export type { Money, Network, MiddlewareConfig, Resource, RouteConfig } from "@bit-gpt/h402/types";
export { createRouteConfigFromPrice } from "@bit-gpt/h402/shared";
