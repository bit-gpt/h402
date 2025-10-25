# Agent Example Client

This example demonstrates how to use the `h402-fetch` package with the Anthropic SDK to make AI model requests through a paid proxy endpoint. It showcases multi-chain payment support for both EVM (Base) and Solana networks.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running h402-proxy server (you can use the example proxy server at `examples/typescript/servers/proxy`)
- A valid Ethereum private key for making payments

## Setup

1. Install and build all packages from the typescript examples root:

```bash
cd ../../
pnpm install
pnpm build
cd agent
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
3. Wrap the native fetch function with h402 payment handling
4. Initialize the Anthropic SDK with the wrapped fetch function
5. Make AI model requests through a paid proxy endpoint

## Example Code

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { wrapFetchWithPayment, createEvmClient, PaymentClient } from "@bit-gpt/h402-fetch";
import { base } from "viem/chains";

config();

const { RESOURCE_SERVER_URL, PRIVATE_KEY } = process.env;
const privateKey = PRIVATE_KEY as `0x${string}`;
const baseURL = RESOURCE_SERVER_URL;

// Create wallet client
const client = createEvmClient(privateKey, base);

// Create payment client
const paymentClient: PaymentClient = {
  evmClient: client,
};

// Create Anthropic client with payment-wrapped fetch
const anthropic = new Anthropic({
  baseURL,
  apiKey: "not needed",
  fetch: wrapFetchWithPayment(fetch, paymentClient),
});

const msg = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude do you know what h402 is?" }],
});
console.log(msg);
```
