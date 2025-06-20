import { h402NextMiddleware } from "h402-next";
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
