import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse, NextRequest } from "next/server";

// Define the middleware configuration
const middlewareConfig = {
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

// Define the onSuccess handler
const onSuccessHandler = async (
  request: NextRequest,
  response: { data?: { txHash?: string } }
) => {
  console.log("onSuccess", response);

  const requestHeaders = new Headers(request.headers);
  const prompt = request.nextUrl.searchParams.get("prompt");
  const txHash = response.data?.txHash;

  const errorRedirectUrl = new URL("/", request.url);

  if (!prompt || prompt.length > 30 || !txHash) {
    console.log("onSuccess", "redirecting to error page");
    console.log({
      prompt,
      txHash,
      errorRedirectUrl,
    });

    // Use redirect instead of rewrite for error case
    return NextResponse.redirect(errorRedirectUrl);
  }

  try {
    const saveTxResponse = await fetch(`${process.env.API_URL}/api/handle-tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txHash }),
    });

    if (!saveTxResponse.ok) {
      console.log("saveTxResponse", "not ok");
      return NextResponse.redirect(errorRedirectUrl);
    }
  } catch (error) {
    console.log("saveTxResponse", "error", error);
    return NextResponse.redirect(errorRedirectUrl);
  }

  request.nextUrl.searchParams.delete("402base64");

  // Create a new request with the modified URL and headers
  const newUrl = request.nextUrl.clone();
  const newRequest = new Request(newUrl, {
    headers: requestHeaders,
  });

  // Return a new response using the modified request
  return NextResponse.next({
    request: newRequest,
  });
};

// Create the middleware with the configuration
// Use a type assertion to fix the compatibility issue
export const middleware = h402Middleware({
  ...middlewareConfig,
  onSuccess: onSuccessHandler,
});

export const config = {
  matcher: "/",
};
