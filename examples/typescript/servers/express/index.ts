import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, Resource, createRouteConfigFromPrice, Network } from "h402-express";

config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as `0x${string}`;
const network = process.env.NETWORK as Network;

if (!facilitatorUrl || !payTo || !network) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();

console.log("Server is running");

app.use(
  paymentMiddleware(
    payTo,
    {
      // Use createRouteConfigFromPrice to construct the RouteConfig
      "/weather": createRouteConfigFromPrice("$0.001", network),
      // Example of advanced configuration with multiple payment options
      "/premium/*": {
        paymentRequirements: [
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "56",
            payToAddress: payTo,
            description: "Premium content access with USDT on BSC",
            tokenDecimals: 18,
          },
          {
            scheme: "exact",
            namespace: "solana",
            tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "mainnet",
            payToAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Example Solana address
            description: "Premium content access with USDC on Solana",
            tokenDecimals: 6,
          },
        ],
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content accessible via multiple payment methods",
    supportedPayments: ["USDT on BSC", "USDC on Solana"],
  });
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:${4021}`);
});
