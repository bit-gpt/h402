import { ChainIdToEvmNetwork, PaymentClient, PaymentRequirementsSchema } from "@bit-gpt/h402/types";
import {
  createPaymentHeader,
  PaymentRequirementsSelector,
  selectPaymentRequirements,
} from "@bit-gpt/h402/client";

/**
 * Enables the payment of APIs using the h402 payment protocol.
 *
 * This function wraps the native fetch API to automatically handle 402 Payment Required responses
 * by creating and sending a payment header. It will:
 * 1. Make the initial request
 * 2. If a 402 response is received, parse the payment requirements
 * 3. Verify the payment amount is within the allowed maximum
 * 4. Create a payment header using the provided wallet client
 * 5. Retry the request with the payment header
 *
 * @param fetch - The fetch function to wrap (typically globalThis.fetch)
 * @param paymentClient - The wallet client used to sign payment messages
 * @param maxValue - The maximum allowed payment amount in base units (defaults to 0.1 USDC)
 * @param paymentRequirementsSelector - A function that selects the payment requirements from the response
 * @returns A wrapped fetch function that handles 402 responses automatically
 *
 * @example
 * ```typescript
 * const wallet = new SignerWallet(...);
 * const fetchWithPay = wrapFetchWithPayment(fetch, wallet);
 *
 * // Make a request that may require payment
 * const response = await fetchWithPay('https://api.example.com/paid-endpoint');
 * ```
 *
 * @throws {Error} If the payment amount exceeds the maximum allowed value
 * @throws {Error} If the request configuration is missing
 * @throws {Error} If a payment has already been attempted for this request
 * @throws {Error} If there's an error creating the payment header
 */
export function wrapFetchWithPayment(
  fetch: typeof globalThis.fetch,
  paymentClient: PaymentClient,
  maxValue: bigint = BigInt(0.1 * 10 ** 6), // Default to 0.10 USDC
  paymentRequirementsSelector: PaymentRequirementsSelector = selectPaymentRequirements,
) {
  return async (input: RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, init);

    if (response.status !== 402) {
      return response;
    }

    const { h402Version, accepts } = (await response.json()) as {
      h402Version: number;
      accepts: unknown[];
    };
    const parsedPaymentRequirements = accepts.map(x => PaymentRequirementsSchema.parse(x));

    // Determine the preferred namespace based on available clients
    let namespace: "evm" | "solana" | undefined;
    if (paymentClient.evmClient && !paymentClient.solanaClient) {
      namespace = "evm";
    } else if (paymentClient.solanaClient && !paymentClient.evmClient) {
      namespace = "solana";
    }
    // If both clients are available, let selectPaymentRequirements choose based on stablecoin preference

    const chainId = paymentClient.evmClient?.chain?.id;

    const selectedPaymentRequirements = paymentRequirementsSelector(
      parsedPaymentRequirements,
      namespace,
      chainId ? ChainIdToEvmNetwork[chainId] : undefined,
      "exact",
    );

    if (BigInt(selectedPaymentRequirements.maxAmountRequired ?? 0) > maxValue) {
      throw new Error("Payment amount exceeds maximum allowed");
    }

    const paymentHeader = await createPaymentHeader(
      paymentClient,
      h402Version,
      selectedPaymentRequirements,
    );

    if (!init) {
      throw new Error("Missing fetch request configuration");
    }

    if ((init as { __is402Retry?: boolean }).__is402Retry) {
      throw new Error("Payment already attempted");
    }

    const newInit = {
      ...init,
      headers: {
        ...(init.headers || {}),
        "X-PAYMENT": paymentHeader,
        "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
      },
      __is402Retry: true,
    };

    const secondResponse = await fetch(input, newInit);
    return secondResponse;
  };
}

export { decodeXPaymentResponse, createEvmClient, createSolanaClient, type PaymentClient } from "@bit-gpt/h402/shared";
