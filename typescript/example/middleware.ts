import {h402NextMiddleware} from "@bit-gpt/h402";
import {imageGenerationPaymentRequirements} from "./config/paymentRequirements";

export const middleware = h402NextMiddleware({
  routes: {
    "/api/generate-image": {
      paymentRequirements: imageGenerationPaymentRequirements
    }
  },
  paywallRoute: "/paywall",
  facilitatorUrl: process.env.FACILITATOR_URL || "http://localhost:3001",
  solanaRpcUrls: process.env.SOLANA_MAINNET_RPC_URL
    ? {
      mainnet: {
        url: process.env.SOLANA_MAINNET_RPC_URL,
        wsUrl: process.env.SOLANA_MAINNET_WS_URL,
      },
    }
    : undefined
});

export const config = {
  matcher: ["/api/generate-image"]
};
