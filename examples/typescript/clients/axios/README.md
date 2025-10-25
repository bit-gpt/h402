# h402-axios Example Client

This is an example client that demonstrates how to use the `h402-axios` package to make HTTP requests to endpoints protected by the h402 payment protocol.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running h402 server (you can use the example express server at `examples/typescript/servers/express`)
- A valid Ethereum or Solana private key for making payments

## Setup

1. Install and build all packages from the typescript examples root:
```bash
cd ../../
pnpm install
pnpm build
cd clients/axios
```

2. Copy `.env-local` to `.env` and add your Ethereum private key (remember it should have USDC on Base Sepolia, which you can provision using the [CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)):
```bash
cp .env-local .env
```

3. Start the example client (remember you need to be running a server locally or point at an endpoint):
```bash
pnpm dev
```

## How It Works

The example demonstrates how to:
1. Create a wallet client
2. Create an Axios instance with h402 payment handling
3. Make a request to a paid endpoint
4. Handle the response or any errors

## Example Code

```typescript
import { config } from "dotenv";
import { withPaymentInterceptor, createEvmClient, PaymentClient } from "@bit-gpt/h402-axios";
import axios from "axios";
import { base } from "viem/chains";

config();

const { RESOURCE_SERVER_URL, PRIVATE_KEY, ENDPOINT_PATH } = process.env;
const privateKey = PRIVATE_KEY as `0x${string}`;
const baseURL = RESOURCE_SERVER_URL;
const endpointPath = ENDPOINT_PATH as string;

// Create wallet client
const client = createEvmClient(privateKey, base);

// Create payment client
const paymentClient: PaymentClient = {
  evmClient: client,
};

// Create Axios instance with payment handling
const api = withPaymentInterceptor(
  axios.create({
    baseURL,
  }),
  paymentClient
);

// Make request to paid endpoint
api
  .get(endpointPath)
  .then(response => {
    console.log(response.headers);
    console.log(response.data);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
```
