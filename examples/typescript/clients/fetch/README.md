# h402-fetch Example Client

This is an example client that demonstrates how to use the `h402-fetch` package to make HTTP requests to endpoints protected by the h402 payment protocol.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running h402 server (you can use the example express server at `examples/typescript/servers/express`)
- A valid Ethereum private key for making payments

## Setup

1. Install and build all packages from the typescript examples root:

```bash
cd ../../
pnpm install
pnpm build
cd clients/fetch
```

2. Copy `.env-local` to `.env` and add your Ethereum private key:

```bash
cp .env-local .env
```

3. Start the example client:

```bash
pnpm dev
```

## How It Works

The example demonstrates how to:

1. Create a wallet client
2. Wrap the native fetch function with h402 payment handling
3. Make a request to a paid endpoint
4. Handle the response or any errors

## Example Code

```typescript
import { config } from "dotenv";
import { wrapFetchWithPayment, createEvmClient, PaymentClient } from "@bit-gpt/h402-fetch";
import { base } from "viem/chains";

config();

const { RESOURCE_SERVER_URL, PRIVATE_KEY, ENDPOINT_PATH } = process.env;
const privateKey = PRIVATE_KEY as `0x${string}`;
const baseURL = RESOURCE_SERVER_URL;
const endpointPath = ENDPOINT_PATH as string;
const url = `${baseURL}${endpointPath}`; 

// Create wallet client
const client = createEvmClient(privateKey, base);

// Create payment client
const paymentClient: PaymentClient = {
  evmClient: client,
};

// Wrap fetch with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, paymentClient);

// Make request to paid endpoint
fetchWithPay(url, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log(body);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
```
