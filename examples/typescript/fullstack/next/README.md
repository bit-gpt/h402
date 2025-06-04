# H402 Next.js Middleware Example

This example demonstrates how to use the h402 middleware in a Next.js application to implement a paywall for your API routes or pages.

## Overview

The h402 middleware allows you to protect routes in your Next.js application and require payment before users can access them. This example shows how to:

1. Configure the middleware
2. Define payment requirements
3. Protect API routes
4. Implement a paywall page
5. Handle successful payments

## Project Structure

```
/example
  /app
    /api
      /generate-image
        /route.ts       # Protected API route
    /paywall
      /page.tsx         # Paywall page
  /components
    /PaymentUI.tsx      # Payment UI component
  /config
    /paymentRequirements.ts  # Payment requirements configuration
  /middleware.ts        # Next.js middleware configuration
```

## How It Works

### 1. Configure the Middleware

The middleware is configured in `middleware.ts`:

```typescript
import { h402NextMiddleware } from "@bit-gpt/h402";
import { imageGenerationPaymentRequirements } from "./config/paymentRequirements";

export const middleware = h402NextMiddleware({
  routes: {
    "/api/generate-image": {
      paymentRequirements: imageGenerationPaymentRequirements,
    },
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
    : undefined,
});

export const config = {
  matcher: ["/api/generate-image"],
};
```

This configuration:

- Protects the `/api/generate-image` route
- Specifies payment requirements for the route
- Sets the paywall route to `/paywall`
- Configures the facilitator URL and Solana RPC URLs

### 2. Define Payment Requirements

Payment requirements are defined in `config/paymentRequirements.ts`:

```typescript
import { PaymentRequirements } from "@bit-gpt/h402/types";

// EVM payment requirement (USDT on BSC)
export const evmPaymentRequirementsUSDTonBSC: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
  tokenDecimals: 18,
  tokenSymbol: "USDT",
  amountRequired: 0.01, // 0.01 USDT
  amountRequiredFormat: "humanReadable",
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "56", // BSC Chain ID
  description: "Access to generated images (EVM)",
  resource: "image-generation",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
};

// Combine all payment requirements
export const imageGenerationPaymentRequirements: PaymentRequirements[] = [
  evmPaymentRequirementsUSDTonBSC,
  // Add more payment options here
];
```

This defines the payment requirements for the protected route, including:

- The blockchain network (EVM/Solana)
- The token to be used for payment
- The amount required
- The recipient address
- Other details about the payment

### 3. Implement a Protected API Route

Create a protected API route in `app/api/generate-image/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // The middleware has already verified the payment
  // You can access payment information from the X-PAYMENT-RESPONSE header
  const paymentResponse = request.headers.get("X-PAYMENT-RESPONSE");

  // Parse the payment response
  let paymentInfo = null;
  if (paymentResponse) {
    try {
      paymentInfo = JSON.parse(paymentResponse);
      console.log("Payment info:", paymentInfo);
    } catch (error) {
      console.error("Error parsing payment response:", error);
    }
  }

  // Process the request
  try {
    // Your business logic here
    // For example, generate an image using AI

    // Simulate image generation
    const generatedImageFilename = `image-${Date.now()}.png`;

    // Return the response
    return NextResponse.json({
      success: true,
      filename: generatedImageFilename,
      message: "Image generated successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate image",
      },
      { status: 500 }
    );
  }
}
```

This API route:

- Receives requests that have been verified by the middleware
- Extracts payment information from the X-PAYMENT-RESPONSE header
- Processes the request and returns a response

### 4. Implement a Paywall Page

The paywall page is implemented in `app/paywall/page.tsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PaymentUI from "@/components/PaymentUI";

export default function PaywallPage() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const paymentRequirementsParam = searchParams.get("requirements");

  const [paymentRequirements, setPaymentRequirements] = useState(null);

  // Parse payment details from URL parameter
  useEffect(() => {
    if (paymentRequirementsParam) {
      try {
        const decodedDetails = JSON.parse(
          decodeURIComponent(paymentRequirementsParam)
        );
        setPaymentRequirements(decodedDetails);
      } catch (error) {
        console.error("Error parsing payment details:", error);
      }
    }
  }, [paymentRequirementsParam]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[800px] mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Complete Payment to Continue
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
          Connect your wallet and pay a small fee to access this content.
        </p>

        <PaymentUI
          prompt="Pay to access content"
          returnUrl={returnUrl || ""}
          paymentRequirements={paymentRequirements}
        />
      </div>
    </div>
  );
}
```

This page:

- Extracts payment requirements and return URL from query parameters
- Renders the PaymentUI component with the payment requirements

### 5. Payment Flow

The payment flow works as follows:

1. User tries to access a protected route (`/api/generate-image`)
2. Middleware checks if the user has paid
3. If not, middleware redirects to the paywall page with payment requirements
4. User makes a payment using the PaymentUI component
5. After successful payment, user is redirected back to the original route
6. Middleware verifies the payment and allows access to the protected route

## Implementation Details

### Middleware Configuration

The `h402NextMiddleware` function takes a configuration object with the following properties:

- `routes`: A map of routes to protect and their payment requirements
- `paywallRoute`: The route to redirect to when payment is required
- `facilitatorUrl`: The URL of the facilitator service that verifies payments
- `solanaRpcUrls`: (Optional) RPC URLs for Solana networks

### Payment Requirements

Each payment requirement object includes:

- `namespace`: The blockchain network (e.g., "evm" or "solana")
- `tokenAddress`: The address of the token to use for payment
- `tokenDecimals`: The number of decimal places for the token
- `tokenSymbol`: The symbol of the token (e.g., "USDT", "SOL")
- `amountRequired`: The amount required for payment
- `amountRequiredFormat`: The format of the amount (e.g., "humanReadable" or "smallestUnit")
- `payToAddress`: The address to send the payment to
- `networkId`: The ID of the network (e.g., "56" for BSC, "mainnet" for Solana)
- `description`: A description of what the payment is for
- `resource`: A unique identifier for the resource being paid for
- `scheme`: The payment scheme (e.g., "exact")

### PaymentUI Component

The PaymentUI component handles:

- Displaying available payment options
- Connecting to wallets
- Making payments
- Handling payment success and errors
- Redirecting back to the original route after payment

## Conclusion

This example demonstrates how to use the h402 middleware to implement a paywall in a Next.js application. By following this example, you can protect your API routes and pages and require payment before users can access them.

For more information, see the [h402 documentation](https://github.com/bit-gpt/h402).
