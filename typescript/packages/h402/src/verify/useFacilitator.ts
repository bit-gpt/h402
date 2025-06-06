import { toJsonSafe } from "../shared";
import {
  FacilitatorConfig,
  FacilitatorResponse,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "../types";

export type CreateHeaders = () => Promise<{
  verify: Record<string, string>;
  settle: Record<string, string>;
}>;

export function useFacilitator({ url }: FacilitatorConfig) {
  async function makeRequest<T>(
    endpoint: string,
    payload: string,
    paymentRequirements: PaymentRequirements
  ): Promise<FacilitatorResponse<T>> {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator:", url);

    try {
      const response = await fetch(`${url}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload,
          paymentRequirements: toJsonSafe(paymentRequirements),
        }),
      });

      if (!response.ok) {
        const error = await response.text().catch(() => response.statusText);
        return { data: null, error: `Failed to ${endpoint} payment: ${error}` };
      }

      const result = (await response.json()) as FacilitatorResponse<T>;
      return { data: result.data, error: result.error };
    } catch (error) {
      console.error(
        `[ERROR-PAYMENT-FLOW] Facilitator connection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        data: null,
        error: `Facilitator service unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  return {
    verify: (payload: string, paymentRequirements: PaymentRequirements) =>
      makeRequest<VerifyResponse>("verify", payload, paymentRequirements),
    settle: (payload: string, paymentRequirements: PaymentRequirements) =>
      makeRequest<SettleResponse>("settle", payload, paymentRequirements),
  };
}
