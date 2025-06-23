import { AxiosError, AxiosInstance } from "axios";
import {
  ChainIdToEvmNetwork,
  PaymentRequirements,
  PaymentRequirementsSchema,
  PaymentClient,
} from "@bit-gpt/h402/types";
import {
  createPaymentHeader,
  PaymentRequirementsSelector,
  selectPaymentRequirements,
} from "@bit-gpt/h402/client";

/**
 * Enables the payment of APIs using the h402 payment protocol.
 *
 * When a request receives a 402 response:
 * 1. Extracts payment requirements from the response
 * 2. Creates a payment header using the provided wallet client(s)
 * 3. Retries the original request with the payment header
 * 4. Exposes the X-PAYMENT-RESPONSE header in the final response
 *
 * @param axiosClient - The Axios instance to add the interceptor to
 * @param paymentClient - A payment client that can handle EVM and/or Solana transactions
 * @param paymentRequirementsSelector - A function that selects the payment requirements from the response
 * @returns The modified Axios instance with the payment interceptor
 *
 * @example
 * ```typescript
 * const client = withPaymentInterceptor(
 *   axios.create(),
 *   { evmClient: signer }
 * );
 *
 * // The client will automatically handle 402 responses
 * const response = await client.get('https://api.example.com/premium-content');
 * ```
 */
export function withPaymentInterceptor(
  axiosClient: AxiosInstance,
  paymentClient: PaymentClient,
  paymentRequirementsSelector: PaymentRequirementsSelector = selectPaymentRequirements,
) {
  axiosClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      if (!error.response || error.response.status !== 402) {
        return Promise.reject(error);
      }

      try {
        const originalConfig = error.config;
        if (!originalConfig || !originalConfig.headers) {
          return Promise.reject(new Error("Missing axios request configuration"));
        }

        if ((originalConfig as { __is402Retry?: boolean }).__is402Retry) {
          return Promise.reject(error);
        }

        const { h402Version, accepts } = error.response.data as {
          h402Version: number;
          accepts: PaymentRequirements[];
        };
        const parsed = accepts.map(x => PaymentRequirementsSchema.parse(x));

        // Determine the preferred namespace based on available clients
        let namespace: "evm" | "solana" | undefined;
        if (paymentClient.evmClient && !paymentClient.solanaClient) {
          namespace = "evm";
        } else if (paymentClient.solanaClient && !paymentClient.evmClient) {
          namespace = "solana";
        }

        const chainId = paymentClient.evmClient?.chain?.id;

        const selectedPaymentRequirements = paymentRequirementsSelector(
          parsed,
          namespace,
          chainId ? ChainIdToEvmNetwork[chainId] : undefined,
          "exact",
        );

        // Validate that the selected payment requirements match the available client
        if (namespace && selectedPaymentRequirements.namespace !== namespace) {
          const availableNamespaces = parsed.map(req => req.namespace).join(", ");
          throw new Error(
            `No compatible payment requirements found. ` +
              `Client supports: ${namespace}, but available payment options are: ${availableNamespaces}. ` +
              `Please ensure your payment client supports one of the available payment methods.`,
          );
        }

        const paymentHeader = await createPaymentHeader(
          paymentClient,
          h402Version,
          selectedPaymentRequirements,
        );

        (originalConfig as { __is402Retry?: boolean }).__is402Retry = true;

        originalConfig.headers["X-PAYMENT"] = paymentHeader;
        originalConfig.headers["Access-Control-Expose-Headers"] = "X-PAYMENT-RESPONSE";

        const secondResponse = await axiosClient.request(originalConfig);
        return secondResponse;
      } catch (paymentError) {
        return Promise.reject(paymentError);
      }
    },
  );

  return axiosClient;
}

export { decodeXPaymentResponse } from "@bit-gpt/h402/shared";
