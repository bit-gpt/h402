import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { utils } from "../index.js";
import {
  FacilitatorResponse,
  PaymentDetails,
  VerifyResponse,
  SettleResponse,
} from "../../types/index.js";
import {
  configureSolanaClusters,
  ClusterConfig,
} from "../../shared/solana/clusterEndpoints.js";

type OnSuccessHandler = (
  request: NextRequest,
  response: FacilitatorResponse<VerifyResponse | SettleResponse>
) => Promise<NextResponse>;

/**
 * Configuration options for the h402 middleware
 * @interface H402Config
 */
interface H402Config {
  /** The routes to apply the middleware to */
  routes: string[];
  /** The paywall route to redirect to */
  paywallRoute: string;
  /** The payment details required for verification and settlement */
  paymentDetails: PaymentDetails;
  /** The URL of the facilitator endpoint */
  facilitatorUrl?: string;
  /** The error handler to use for the middleware */
  onError?: (error: string, request: NextRequest) => NextResponse;
  /** The success handler to use for the middleware */
  onSuccess?: OnSuccessHandler;
  /** Solana cluster configuration */
  solanaConfig?: Partial<Record<string, ClusterConfig>>;
}

/**
 * Creates a middleware for h402 payment verification and settlement
 *
 * @param {H402Config} config - Configuration options for the middleware
 * @returns {(request: NextRequest) => Promise<NextResponse>} Middleware handler function
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { h402NextMiddleware } from '@bit-gpt/h402/middleware'
 * import { paymentDetails } from './config/paymentDetails'
 *
 * export const middleware = h402NextMiddleware({
 *   routes: ['/paywalled_route'],
 *   paywallRoute: '/paywall',
 *   paymentDetails,
 *   facilitatorUrl: 'http://localhost:3000/api/facilitator',
 * })
 *
 * export const config = {
 *   matcher: '/paywalled_route'
 * }
 * ```
 */
function h402NextMiddleware(config: H402Config) {
  const {
    facilitatorUrl,
    paymentDetails,
    onError,
    onSuccess,
    routes,
    paywallRoute,
    solanaConfig,
  } = config;
  const { verify, settle } = utils.useFacilitator(
    facilitatorUrl ?? "https://facilitator.bitgpt.xyz"
  );

  if (solanaConfig) {
    configureSolanaClusters(solanaConfig);
  }

  const defaultErrorHandler = (request: NextRequest) => {
    const redirectUrl = new URL(paywallRoute, request.url);
    return NextResponse.rewrite(redirectUrl, { status: 402 });
  };

  const handleError = (error: string, request: NextRequest) =>
    onError ? onError(error, request) : defaultErrorHandler(request);

  return async function handler(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (!routes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    const payment = request.nextUrl.searchParams.get("402base64");

    if (!payment) {
      return handleError("Payment Required", request);
    }

    const verifyResponse = await verify(payment, paymentDetails);

    if (verifyResponse.error) {
      return handleError(verifyResponse.error, request);
    }

    const paymentType = verifyResponse.data?.type;

    if (paymentType === "payload") {
      const settleResponse = await settle(payment, paymentDetails);

      if (settleResponse.error) {
        return handleError(settleResponse.error, request);
      }

      if (onSuccess) {
        return await (onSuccess as OnSuccessHandler)(request, settleResponse);
      }
    } else if (onSuccess) {
      return await (onSuccess as OnSuccessHandler)(request, verifyResponse);
    }

    request.nextUrl.searchParams.delete("402base64");

    return NextResponse.next();
  };
}

export { h402NextMiddleware };
