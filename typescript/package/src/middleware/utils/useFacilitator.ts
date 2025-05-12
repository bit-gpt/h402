import { toJsonSafe } from "../../shared/index.js";
import {
  PaymentDetails,
  VerifyResponse,
  SettleResponse,
  FacilitatorResponse,
} from "../../types/index.js";

function useFacilitator(url: string) {
  async function makeRequest<T>(
    endpoint: string,
    payload: string,
    paymentDetails: PaymentDetails
  ): Promise<FacilitatorResponse<T>> {
    const response = await fetch(`${url}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload,
        paymentDetails: toJsonSafe(paymentDetails),
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to ${endpoint} payment: ${error}`);
    }

    const result = (await response.json()) as FacilitatorResponse<T>;
    if (result.error) {
      throw new Error(result.error);
    }

    return { data: result.data, error: result.error };
  }

  return {
    verify: (payload: string, paymentDetails: PaymentDetails) =>
      makeRequest<VerifyResponse>("verify", payload, paymentDetails),
    settle: (payload: string, paymentDetails: PaymentDetails) =>
      makeRequest<SettleResponse>("settle", payload, paymentDetails),
  };
}

export { useFacilitator };
