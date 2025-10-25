# h402-proxy

Express middleware integration for the h402 Payment Protocol that enables you to monetize any external API with crypto payments. This package allows you to easily add paywall functionality to external services using the h402 protocol.

## Installation

```bash
npm install @bit-gpt/h402-proxy
```

## Quick Start

```typescript
import express from "express";
import { h402Proxy, createRouteConfigFromPrice } from "@bit-gpt/h402-proxy";

const app = express();

// Proxy to Anthropic Claude with payment protection
app.use('/claude', h402Proxy({
  target: 'https://api.anthropic.com',
  routes: {
    '/v1/messages': createRouteConfigFromPrice('$0.03', 'base', '0xYourAddress')
  },
  headers: {
    'x-api-key': process.env.ANTHROPIC_KEY
  }
}));

app.listen(3000);
```

## Configuration

The `h402Proxy` function accepts the following configuration:

### Basic Configuration

```typescript
interface ProxyConfig {
  /** Target URL to proxy requests to */
  target: string;
  
  /** h402 payment configuration for routes */
  routes: RoutesConfig;
  
  /** Headers to inject into proxied requests */
  headers?: Record<string, string>;
  
  /** Proxy-specific options */
  proxyOptions?: ProxyOptions;
  
  /** h402 facilitator configuration */
  facilitator?: FacilitatorConfig;
  
}
```

### Route Configuration

Routes are configured using the same pattern as `h402-express`:

```typescript
import { createRouteConfigFromPrice } from "@bit-gpt/h402-proxy";

const routes = {
  // Simple price string
  '/v1/messages': '$0.03',
  
  // Advanced configuration
  '/v1/chat/completions': createRouteConfigFromPrice('$0.05', 'base', '0xYourAddress'),
  
  // Multiple payment options
  '/premium/*': {
    paymentRequirements: [
      {
        scheme: "exact",
        namespace: "evm",
        tokenAddress: "0x...",
        amountRequired: 0.01,
        amountRequiredFormat: "humanReadable",
        networkId: "8453",
        payToAddress: "0x...",
        description: "Premium API access"
      }
    ]
  }
};
```

### Proxy Options

```typescript
interface ProxyOptions {
  /** Change the origin of the host header to the target URL */
  changeOrigin?: boolean;
  
  /** Rewrite the request path before proxying */
  pathRewrite?: (path: string, req: Request) => string;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Follow redirects (default: false) */
  followRedirects?: boolean;
  
  /** Hook called before proxying the request */
  onProxyReq?: (proxyReq: ClientRequest, req: Request, res: Response) => void;
  
  /** Hook called when proxy response is received */
  onProxyRes?: (proxyRes: IncomingMessage, req: Request, res: Response) => void;
  
  /** Hook called when proxy encounters an error */
  onError?: (err: Error, req: Request, res: Response) => void;
}
```

## Examples

### Anthropic Claude

```typescript
app.use('/claude', h402Proxy({
  target: 'https://api.anthropic.com',
  routes: {
    '/v1/messages': createRouteConfigFromPrice('$0.03', 'base', YOUR_ADDRESS)
  },
  headers: {
    'x-api-key': process.env.ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01'
  }
}));
```

### OpenAI

```typescript
app.use('/openai', h402Proxy({
  target: 'https://api.openai.com',
  routes: {
    '/v1/chat/completions': '$0.05',
    '/v1/embeddings': '$0.01'
  },
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_KEY}`
  },
  proxyOptions: {
    timeout: 60000
  }
}));
```
### Path Rewriting

```typescript
app.use('/api', h402Proxy({
  target: 'https://backend.example.com',
  routes: { '/*': '$0.01' },
  headers: { 'Authorization': `Bearer ${process.env.SERVICE_KEY}` },
  proxyOptions: {
    pathRewrite: (path) => path.replace('/api', '/v2'),
    timeout: 30000
  }
}));
```
