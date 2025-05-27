import { type PaymentRequirements } from "./protocol.js";

export type FacilitatorRequest = {
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
};

export type FacilitatorResponse<T> = {
  data: T | null;
  error?: string;
};

export type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
  transaction?: string | undefined;
  network?: string | undefined;
  payer?: string | undefined;
};

export type VerifyResponse = {
  isValid: boolean;
  type?: "payload" | "transaction";
  txHash?: string;
  errorMessage?: string | undefined;
};

/**
 * Configuration for the payment facilitator service
 */
export interface FacilitatorConfig {
  /** URL of the facilitator service */
  url: string;
  /** Optional function to create authentication headers */
  createAuthHeaders?: () => Record<string, string>;
}
