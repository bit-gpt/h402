import { h402NextMiddleware } from "@bit-gpt/h402";
import { imageGenerationPaymentRequirements } from "./config/paymentRequirements";

export const middleware = h402NextMiddleware({
  routes: {
    "/image": {
      paymentRequirements: imageGenerationPaymentRequirements,
    },
  },
  facilitatorUrl:
    process.env.FACILITATOR_URL || "https://facilitator.bitgpt.xyz",
});

export const config = {
  matcher: ["/image"],
};
