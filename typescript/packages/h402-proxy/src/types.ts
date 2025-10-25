import type { Request, Response, NextFunction } from "express";
import type { ClientRequest, IncomingMessage } from "http";
import type { RoutesConfig, FacilitatorConfig } from "@bit-gpt/h402/types";

export interface ProxyOptions {
  changeOrigin?: boolean;
  pathRewrite?: (path: string, req: Request) => string;
  timeout?: number;
  followRedirects?: boolean;
  onProxyReq?: (proxyReq: ClientRequest, req: Request, res: Response) => void;
  onProxyRes?: (proxyRes: IncomingMessage, req: Request, res: Response) => void;
  onError?: (err: Error, req: Request, res: Response) => void;
}

export interface ProxyConfig {
  target: string;
  routes: RoutesConfig;
  headers?: Record<string, string>;
  proxyOptions?: ProxyOptions;
  facilitator?: FacilitatorConfig;
}

export class ProxyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 502,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
