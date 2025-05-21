import { NextRequest, NextResponse } from "next/server";
import { MiddlewareConfig, PaymentRequirements } from "../../types/protocol.js";
import { getPaywallHtml } from "../../shared/paywall";
import { toJsonSafe } from "../../shared/index.js";
import { VerifyResponse, FacilitatorResponse } from "../../types/index.js";
import { useFacilitator } from "../utils";
import { safeBase64Decode } from "../../shared/base64.js";
import { enrichPaymentRequirements } from "../../shared/enrichPaymentRequirements";

/**
 * Enhanced h402NextMiddleware that supports multiple payment options via X-PAYMENT header
 */
export function h402NextMiddleware(config: MiddlewareConfig) {
  // Create facilitator client using the hook
  const facilitatorUrl =
    config.facilitatorUrl || "https://facilitator.bitgpt.xyz";
  const { verify, settle } = useFacilitator(facilitatorUrl);

  /**
   * Create a 402 response for API requests
   */
  const createApiPaymentRequiredResponse = (
    error: string,
    paymentRequirements: PaymentRequirements[]
  ) => {
    return NextResponse.json(
      {
        error,
        paymentRequirements: toJsonSafe(paymentRequirements),
      },
      { status: 402 }
    );
  };

  /**
   * Handle browser requests that require payment
   */
  const handleBrowserPaymentRequired = async (
    request: NextRequest,
    paymentRequirements: PaymentRequirements[]
  ) => {
    // Check if a paywall route is configured
    if (config.paywallRoute) {
      const redirectUrl = new URL(config.paywallRoute, request.url);

      // Set the return URL
      redirectUrl.searchParams.set("returnUrl", request.url);

      // Enrich payment requirements with metadata
      const enrichedRequirements = await enrichPaymentRequirements(
        paymentRequirements
      );

      // Set the payment requirements
      redirectUrl.searchParams.set(
        "requirements",
        JSON.stringify(toJsonSafe(enrichedRequirements))
      );

      // Extract and pass along the prompt parameter if it exists in the original request
      const originalUrl = new URL(request.url);
      const prompt = originalUrl.searchParams.get("prompt");
      if (prompt) {
        redirectUrl.searchParams.set("prompt", prompt);
      }

      return NextResponse.redirect(redirectUrl);
    }

    // Inline HTML paywall if no paywall route is configured
    const enrichedRequirements = await enrichPaymentRequirements(
      paymentRequirements
    );
    return new NextResponse(
      getPaywallHtml({
        paymentRequirements: enrichedRequirements,
        currentUrl: request.url,
      }),
      {
        status: 402,
        headers: { "Content-Type": "text/html" },
      }
    );
  };

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Find matching route
    const matchingRoute = Object.entries(config.routes).find(([route, _]) => {
      if (route.endsWith("*")) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route;
    });

    // If no matching route, allow the request to proceed
    if (!matchingRoute) {
      return NextResponse.next();
    }

    const [_, routeConfig] = matchingRoute;
    const paymentRequirements = routeConfig.paymentRequirements;
    const paymentHeader = request.headers.get("X-PAYMENT");
    const accept = request.headers.get("Accept");
    const isHtmlRequest = accept?.includes("text/html");

    // If no payment header provided, return payment required response
    if (!paymentHeader) {
      return isHtmlRequest
        ? handleBrowserPaymentRequired(request, paymentRequirements)
        : createApiPaymentRequiredResponse(
            "Payment required",
            paymentRequirements
          );
    }

    // Try to verify the payment
    let verificationResult: FacilitatorResponse<VerifyResponse> | null = null;
    let selectedRequirement = null;

    try {
      // Try to match the payment payload with appropriate requirement
      const decodedPayload = safeBase64Decode(paymentHeader);
      const paymentPayload = JSON.parse(decodedPayload);
      const { namespace, networkId, scheme, resource } = paymentPayload;

      console.log(
        `[Payment] Decoded payload: namespace=${namespace}, networkId=${networkId}, scheme=${scheme}, resource=${resource}`
      );

      // Find matching payment requirements
      const matchingRequirements = paymentRequirements.filter(
        (req) =>
          req.namespace === namespace &&
          req.networkId === networkId &&
          req.scheme === scheme &&
          req.resource === resource
      );

      if (matchingRequirements.length > 0) {
        // Try each matching requirement until one succeeds
        for (const requirement of matchingRequirements) {
          const result = await verify(paymentHeader, requirement);
          if (!result.error) {
            verificationResult = result;
            selectedRequirement = requirement;
            break;
          }
        }
      } else {
        console.log(`[Payment] No matching requirements found for payload`);
      }
    } catch (error) {
      console.error("[Payment] Error decoding payload:", error);
    }

    console.log("verificationResult", verificationResult);
    console.log("selectedRequirement", selectedRequirement);

    // If no successful verification yet, return error
    if (!verificationResult || verificationResult.error) {
      const errorMessage =
        verificationResult?.error ||
        "Payment verification failed: Invalid payment payload";
      return isHtmlRequest
        ? handleBrowserPaymentRequired(request, paymentRequirements)
        : createApiPaymentRequiredResponse(errorMessage, paymentRequirements);
    }

    // Payment verified, check if settlement is needed
    try {
      const paymentType = verificationResult.data?.type;
      const response = NextResponse.next();
      let responseData;

      console.log("Settle paymentType", paymentType);

      if (paymentType === "payload" && selectedRequirement) {
        // Needs settlement
        const settlement = await settle(paymentHeader, selectedRequirement);

        console.log("settlement", settlement);

        if (settlement.error) {
          throw new Error(settlement.error);
        }

        responseData = {
          success: true,
          transaction: settlement.data?.transaction,
          network: settlement.data?.network,
          payer: settlement.data?.payer,
        };
      } else {
        // Already verified/settled
        responseData = {
          success: true,
          ...verificationResult.data,
        };
      }

      // Add payment response header
      response.headers.set("X-PAYMENT-RESPONSE", JSON.stringify(responseData));
      return response;
    } catch (error) {
      const errorMessage = `Payment settlement failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return isHtmlRequest
        ? handleBrowserPaymentRequired(request, paymentRequirements)
        : createApiPaymentRequiredResponse(errorMessage, paymentRequirements);
    }
  };
}
