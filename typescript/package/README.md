# @bit-gpt/h402

BitGPT's 402 open protocol for blockchain-native payments.

## Features

- Support for multiple payment schemes (exact, subscription)
- Support for multiple blockchains (EVM, Solana)
- Middleware for Express and Next.js
- Static HTML paywall bundle for serving directly from middleware

## Installation

```bash
npm install @bit-gpt/h402
```

## Usage

### Next.js Middleware

```javascript
import { h402NextMiddleware } from '@bit-gpt/h402/middleware';

// Configure the middleware
const middleware = h402NextMiddleware({
  facilitatorUrl: 'https://facilitator.bitgpt.xyz',
  routes: {
    '/api/protected': {
      paymentRequirements: [
        {
          scheme: 'exact',
          namespace: 'evm',
          networkId: 'base',
          payTo: '0x...',
          maxAmountRequired: 100000000, // 100 USDC (6 decimals)
          maxTimeoutSeconds: 3600,
          resource: '/api/protected',
          description: 'Access to protected API',
        }
      ]
    }
  }
});

// Export the middleware
export { middleware };
```

### Static HTML Paywall Bundle

The package now includes a static HTML paywall bundle that can be served directly from the middleware when a 402 status is encountered, instead of redirecting to a paywall route.

To build the static HTML paywall bundle:

```bash
npm run build:paywall
```

This will build the paywall-app with static export and copy the output to the `static/paywall` directory.

The middleware will automatically serve the static HTML bundle when a 402 status is encountered.

## Documentation

For more detailed documentation, see the [scripts/README.md](./scripts/README.md) file.

## License

Apache-2.0
