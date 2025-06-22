import { toJsonSafe } from "../shared";
import { FacilitatorConfig } from "../types";
import {
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "../types/verify";

const DEFAULT_FACILITATOR_URL = "https://facilitator.bitgpt.xyz";

export type CreateHeaders = () => Promise<{
  verify: Record<string, string>;
  settle: Record<string, string>;
}>;

/**
 * Creates a facilitator client for interacting with the h402 payment facilitator service
 *
 * @param facilitator - The facilitator config to use. If not provided, the default facilitator will be used.
 * @returns An object containing verify and settle functions for interacting with the facilitator
 */
export function useFacilitator(facilitator?: FacilitatorConfig) {
  /**
   * Verifies a payment payload with the facilitator service
   *
   * @param payload - The payment payload to verify (base64 encoded)
   * @param paymentRequirements - The payment requirements to verify against
   * @returns A promise that resolves to the verification response
   */
  async function verify(
    payload: string,
    paymentRequirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator:", facilitator?.url);
    
    const url = facilitator?.url || DEFAULT_FACILITATOR_URL;

    let headers = { "Content-Type": "application/json" };
    if (facilitator?.createAuthHeaders) {
      const authHeaders = await facilitator.createAuthHeaders();
      headers = { ...headers, ...authHeaders.verify };
    }

    const res = await fetch(`${url}/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payload,
        paymentRequirements: toJsonSafe(paymentRequirements),
      }),
    });

    if (res.status !== 200) {
      throw new Error(`Failed to verify payment: ${res.statusText}`);
    }

    const data = await res.json();
    return data as VerifyResponse;
  }

  /**
   * Settles a payment with the facilitator service
   *
   * @param payload - The payment payload to settle (base64 encoded)
   * @param paymentRequirements - The payment requirements for the settlement
   * @returns A promise that resolves to the settlement response
   */
  async function settle(
    payload: string,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    console.log("[DEBUG-PAYMENT-FLOW] Making request to facilitator:", facilitator?.url);
    
    const url = facilitator?.url || DEFAULT_FACILITATOR_URL;

    let headers = { "Content-Type": "application/json" };
    if (facilitator?.createAuthHeaders) {
      const authHeaders = await facilitator.createAuthHeaders();
      headers = { ...headers, ...authHeaders.settle };
    }

    const res = await fetch(`${url}/settle`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payload,
        paymentRequirements: toJsonSafe(paymentRequirements),
      }),
    });

    if (res.status !== 200) {
      const text = res.statusText;
      throw new Error(`Failed to settle payment: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data as SettleResponse;
  }

  return { verify, settle };
}
