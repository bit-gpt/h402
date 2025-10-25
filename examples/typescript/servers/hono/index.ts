import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, Resource, createRouteConfigFromPrice, Network } from "h402-hono";

config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const evmAddress = process.env.EVM_ADDRESS as `0x${string}`;
const solanaAddress = process.env.SOLANA_ADDRESS as string;
const network = process.env.NETWORK as Network;

if (!facilitatorUrl || !network) {
  console.error("Missing required environment variables");
  process.exit(1);
}

if (
  !evmAddress && !solanaAddress
) {
  console.error("Missing required environment variables: EVM_ADDRESS or SOLANA_ADDRESS");
  process.exit(1);
}

if (network === "solana" && !solanaAddress) {
  console.error("Missing required environment variable: SOLANA_ADDRESS");
  process.exit(1);
}

if (network !== "solana" && !evmAddress) {
  console.error("Missing required environment variable: EVM_ADDRESS");
  process.exit(1);
}

const app = new Hono();

console.log("Server is running");

app.use(
  paymentMiddleware(
    {
      // Use createRouteConfigFromPrice to construct the RouteConfig
      "/weather": createRouteConfigFromPrice("$0.001", network, evmAddress, solanaAddress),
      "/premium/*": {
        paymentRequirements: [
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "56",
            payToAddress: evmAddress,
            description: "Premium content access with USDT on BSC",
            tokenDecimals: 18,
            tokenSymbol: "USDT",
          },
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT on Base
            amountRequired: 0.01, 
            amountRequiredFormat: "humanReadable", 
            networkId: "8453", 
            payToAddress: evmAddress,
            description: "Premium content access with USDT on Base",
            tokenDecimals: 6,
            tokenSymbol: "USDT",
          },
          {
            scheme: "exact",
            namespace: "solana",
            tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "mainnet",
            payToAddress: solanaAddress, // Example Solana address
            description: "Premium content access with USDC on Solana",
            tokenDecimals: 6,
            tokenSymbol: "USDC",
          },
        ],
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

app.get("/weather", c => {
  return c.json({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", c => {
  return c.json({
    content: "This is premium content accessible via multiple payment methods",
    supportedPayments: ["USDT on BSC", "USDT on Base", "USDC on Solana"],
  });
});

serve({
  fetch: app.fetch,
  port: 4021,
});
