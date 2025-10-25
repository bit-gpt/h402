import type { Request, Response, NextFunction } from "express";
import type * as http from "http";
import z from "zod";
import { createProxyMiddleware } from "http-proxy-middleware";
import { paymentMiddleware } from "@bit-gpt/h402-express";
import { FacilitatorConfig, Resource } from "@bit-gpt/h402/types";
import { CreateHeaders } from "@bit-gpt/h402/verify";

import type { ProxyConfig, RequestHandler } from "./types";
import { ProxyError } from "./types";


const ProxyConfigSchema = z.object({
  target: z.string().url("Target must be a valid URL"),
  routes: z.record(z.string(), z.any()),
  headers: z.record(z.string(), z.string()).optional(),
  proxyOptions: z.object({
    changeOrigin: z.boolean().optional(),
    pathRewrite: z.function().args(z.string(), z.any()).returns(z.string()).optional(),
    timeout: z.number().positive().optional(),
    followRedirects: z.boolean().optional(),
    onProxyReq: z.function().args(z.any(), z.any(), z.any()).returns(z.void()).optional(),
    onProxyRes: z.function().args(z.any(), z.any(), z.any()).returns(z.void()).optional(),
    onError: z.function().args(z.any(), z.any(), z.any()).returns(z.void()).optional(),
  }).optional(),
  facilitator: z.object({
    url: z.custom<Resource>((val) => {
      return typeof val === 'string' && /^.+:\/\/.+/.test(val);
    }, "Facilitator URL must be a valid URL"),
    createAuthHeaders: z.custom<CreateHeaders>().optional(),
  }) satisfies z.ZodType<FacilitatorConfig>
});

/**
 * Creates an h402 payment-protected proxy middleware for Express
 * 
 * @param config - Proxy configuration
 * @returns Express middleware function
 * 
 * @throws {ProxyError} When configuration is invalid
 * @public
 */
export function h402Proxy(config: ProxyConfig): RequestHandler {
  const validationResult = ProxyConfigSchema.safeParse(config);
  if (!validationResult.success) {
    throw new ProxyError(
      `Invalid configuration: ${validationResult.error.message}`,
      'INVALID_CONFIG',
      400
    );
  }

  const validatedConfig = validationResult.data;

  const paymentHandler = paymentMiddleware(
    validatedConfig.routes,
    validatedConfig.facilitator,
    { asyncSettlement: true }
  );

  const proxyHandler = createProxyMiddleware({
    target: validatedConfig.target,
    changeOrigin: validatedConfig.proxyOptions?.changeOrigin ?? true,
    timeout: validatedConfig.proxyOptions?.timeout ?? 30000,
    followRedirects: validatedConfig.proxyOptions?.followRedirects ?? false,
    pathRewrite: validatedConfig.proxyOptions?.pathRewrite,
    selfHandleResponse: true,
    on: {
      proxyReq: (proxyReq: http.ClientRequest, req: Request, res: Response) => {
        try {
          if (validatedConfig.headers) {
            Object.entries(validatedConfig.headers).forEach(([key, value]) => {
              proxyReq.setHeader(key, value);
            });
          }
          
          validatedConfig.proxyOptions?.onProxyReq?.(proxyReq, req, res);
          
          console.debug('Proxying request', {
            method: req.method,
            path: req.path,
            target: validatedConfig.target,
          });
        } catch (error) {
          console.error('Error in proxyReq hook', { 
            error: error instanceof Error ? error.message : error 
          });
          throw error;
        }
      },
      proxyRes: async (proxyRes: http.IncomingMessage, req: Request, res: Response) => {
        try {
          console.debug('Received proxy response', {
            statusCode: proxyRes.statusCode,
            method: req.method,
            path: req.path,
          });

          res.status(proxyRes.statusCode || 200);
          
          Object.keys(proxyRes.headers).forEach(key => {
            const value = proxyRes.headers[key];
            if (value !== undefined) {
              res.setHeader(key, value);
            }
          });
          
          validatedConfig.proxyOptions?.onProxyRes?.(proxyRes, req, res);
          
          // Wait for payment settlement to complete before streaming
          // The payment middleware sets res.__h402Settlement promise
          const settlementPromise = (res as any).__h402Settlement;
          if (settlementPromise) {
            console.debug('Waiting for payment settlement before streaming...');
            try {
              await settlementPromise;
              console.debug('Payment settlement complete, starting stream');
            } catch (error) {
              console.error('Payment settlement failed:', error);
              if (!res.headersSent) {
                res.status(402).json({
                  error: 'Payment settlement failed',
                  message: error instanceof Error ? error.message : 'Unknown error',
                });
              }
              return;
            }
          }
          
          proxyRes.pipe(res);
        } catch (error) {
          console.error('Error in proxyRes hook', { 
            error: error instanceof Error ? error.message : error 
          });
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Internal Server Error',
              message: 'Failed to process proxy response',
              code: 'PROXY_RES_ERROR',
            });
          }
        }
      },
      error: (err: Error, req: Request, res: Response | any) => {
        console.error('Proxy error', {
          error: err.message,
          method: req.method,
          path: req.path,
        });

        validatedConfig.proxyOptions?.onError?.(err, req, res);

        if (res && typeof res.status === 'function' && !res.headersSent) {
          res.status(502).json({
            error: 'Bad Gateway',
            message: 'Failed to proxy request to target server',
            code: 'PROXY_ERROR',
          });
        }
      },
    },
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    paymentHandler(req, res, (err: any) => {
      if (err) {
        console.error('Payment middleware error', {
          error: err instanceof Error ? err.message : err,
          method: req.method,
          path: req.path,
        });
        
        if (!res.headersSent) {
          const statusCode = err.statusCode || err.status || 402;
          res.status(statusCode).json({
            error: err.name || 'Payment Required',
            message: err.message || 'Payment validation failed',
            code: err.code || 'PAYMENT_ERROR',
          });
        }
        return;
      }
      
      proxyHandler(req, res, next);
    });
  };
}

export { createRouteConfigFromPrice } from "@bit-gpt/h402-express";
export type { ProxyOptions } from "./types";