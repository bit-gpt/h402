import { toJsonSafe } from "../../shared/index.js";
import {
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
  FacilitatorResponse,
} from "../../types/index.js";

function useFacilitator(url: string) {
  async function makeRequest<T>(
    endpoint: string,
    payload: string,
    paymentRequirements: PaymentRequirements
  ): Promise<FacilitatorResponse<T>> {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator:", url);
    console.log(
      "[DEBUG-PAYMENT-FLOW] Making request to facilitator endpoint:",
      endpoint
    );
    console.log(
      "[DEBUG-PAYMENT-FLOW] Making request to facilitator payload:",
      payload
    );
    console.log(
      "[DEBUG-PAYMENT-FLOW] Making request to facilitator payment requirements:",
      paymentRequirements
    );
    
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
      console.error(`[ERROR-PAYMENT-FLOW] Facilitator connection error: ${error instanceof Error ? error.message : String(error)}`);
      return { 
        data: null, 
        error: `Facilitator service unavailable: ${error instanceof Error ? error.message : String(error)}` 
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

export { useFacilitator };
