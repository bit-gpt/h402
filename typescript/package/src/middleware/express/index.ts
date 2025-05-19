import { Request, Response, NextFunction } from "express";
import { utils } from "../index.js";
import {
  FacilitatorResponse,
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
} from "../../types/index.js";

type OnSuccessHandler = (
  req: Request,
  res: Response,
  response: FacilitatorResponse<VerifyResponse | SettleResponse>
) => Promise<void>;

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
  paymentRequirements: PaymentRequirements;
  /** The URL of the facilitator endpoint */
  facilitatorUrl?: string;
  /** The error handler to use for the middleware */
  onError?: (error: string, req: Request, res: Response) => void;
  /** The success handler to use for the middleware */
  onSuccess?: OnSuccessHandler;
}

/**
 * Creates a middleware for h402 payment verification and settlement
 *
 * @param {H402Config} config - Configuration options for the middleware
 * @returns {(req: Request, res: Response, next: NextFunction) => Promise<void>} Middleware handler function
 *
 * @example
 * ```ts
 * // app.ts
 * import express from 'express'
 * import { h402ExpressMiddleware } from '@bit-gpt/h402/middleware'
 * import { paymentRequirements } from './config/paymentRequirements'
 *
 * const app = express()
 *
 * app.use(h402ExpressMiddleware({
 *   routes: ['/paywalled_route'],
 *   paywallRoute: '/paywall',
 *   paymentRequirements,
 *   facilitatorUrl: 'http://localhost:3000/api/facilitator',
 * }))
 * ```
 */
function h402ExpressMiddleware(config: H402Config) {
  const {
    facilitatorUrl,
    paymentRequirements,
    onError,
    onSuccess,
    routes,
    paywallRoute,
  } = config;
  const { verify, settle } = utils.useFacilitator(
    facilitatorUrl ?? "https://facilitator.bitgpt.xyz"
  );

  const defaultErrorHandler = (req: Request, res: Response) => {
    res.redirect(402, paywallRoute);
  };

  const handleError = (error: string, req: Request, res: Response) =>
    onError ? onError(error, req, res) : defaultErrorHandler(req, res);

  return async function handler(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const pathname = req.path;

    if (!routes.some((route) => pathname.startsWith(route))) {
      return next();
    }

    const payment = req.query["402base64"] as string;

    if (!payment) {
      return handleError("Payment Required", req, res);
    }

    const verifyResponse = await verify(payment, paymentRequirements);

    if (verifyResponse.error) {
      return handleError(verifyResponse.error, req, res);
    }

    const paymentType = verifyResponse.data?.type;

    if (paymentType === "payload") {
      const settleResponse = await settle(payment, paymentRequirements);

      if (settleResponse.error) {
        return handleError(settleResponse.error, req, res);
      }

      if (onSuccess) {
        return await onSuccess(req, res, settleResponse);
      }
    } else if (onSuccess) {
      return await onSuccess(req, res, verifyResponse);
    }

    // Remove the payment parameter from the query
    delete req.query["402base64"];

    next();
  };
}

export { h402ExpressMiddleware };
