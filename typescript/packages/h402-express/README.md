# h402-express

Express middleware integration for the h402 Payment Protocol. This package allows you to easily add paywall functionality to your Express.js applications using the h402 protocol.

## Installation

```bash
npm install @bit-gpt/h402-express
```

## Quick Start

```typescript
import express from "express";
import { paymentMiddleware, Network } from "h402-express";

const app = express();

// Configure the payment middleware
app.use(paymentMiddleware(
  "0xYourAddress",
  {
    "/protected-route": {
      price: "$0.10",
      network: "bsc",
      config: {
        description: "Access to premium content",
      }
    }
  }
));

// Implement your route
app.get("/protected-route", 
  (req, res) => {
    res.json({ message: "This content is behind a paywall" });
  }
);

app.listen(3000);
```

## Configuration

The `paymentMiddleware` function accepts three parameters:

1. `payTo`: Your receiving address (`0x${string}`)
2. `routes`: Route configurations for protected endpoints
3. `facilitator`: (Optional) Configuration for the h402 facilitator service

See the Middleware Options section below for detailed configuration options.

## Middleware Options

The middleware supports various configuration options:

### Route Configuration

```typescript
type RoutesConfig = Record<string, Price | RouteConfig>;

interface RouteConfig {
  price: Price;           // Price in USD or token amount
  network: Network;       // "base" or "base-sepolia"
  config?: PaymentMiddlewareConfig;
}
```

### Payment Configuration

```typescript
interface PaymentMiddlewareConfig {
  description?: string;               // Description of the payment
  mimeType?: string;                  // MIME type of the resource
  maxTimeoutSeconds?: number;         // Maximum time for payment (default: 60)
  outputSchema?: Record<string, any>; // JSON schema for the response
  customPaywallHtml?: string;         // Custom HTML for the paywall
  resource?: string;                  // Resource URL (defaults to request URL)
}
```

### Facilitator Configuration

```typescript
type FacilitatorConfig = {
  url: string;                        // URL of the h402 facilitator service
  createAuthHeaders?: CreateHeaders;  // Optional function to create authentication headers
};
```
