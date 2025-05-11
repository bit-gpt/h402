import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse, NextRequest } from "next/server";

// Define the middleware configuration
const middlewareConfig = {
  facilitatorUrl: "http://localhost:3004",
  routes: ["/"],
  paywallRoute: "/",
  paymentDetails,
};

// Add Solana configuration if environment variables are available
if (process.env.SOLANA_MAINNET_RPC_URL) {
  Object.assign(middlewareConfig, {
    solanaConfig: {
      mainnet: {
        url: process.env.SOLANA_MAINNET_RPC_URL,
        wsUrl: process.env.SOLANA_MAINNET_WS_URL,
      },
    },
  });
}

// Create the middleware with the configuration
export const middleware = h402Middleware({
  ...middlewareConfig,
});

export const config = {
  matcher: "/",
};
