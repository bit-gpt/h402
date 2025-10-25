import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { Hex } from "viem";
import { wrapFetchWithPayment, createEvmClient, createSolanaClient, PaymentClient } from "@bit-gpt/h402-fetch";
import { base } from "viem/chains";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string;

if (!baseURL) {
  console.error("Missing RESOURCE_SERVER_URL environment variable");
  process.exit(1);
}

if (!evmPrivateKey && !solanaPrivateKey) {
  console.error("At least one of EVM_PRIVATE_KEY or SOLANA_PRIVATE_KEY must be provided");
  process.exit(1);
}

const evmClient = evmPrivateKey
  ? createEvmClient(evmPrivateKey, base)
  : undefined;

const solanaClient = solanaPrivateKey
  ? createSolanaClient(solanaPrivateKey)
  : undefined;

const paymentClient: PaymentClient = {
  evmClient,
  solanaClient,
};

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
