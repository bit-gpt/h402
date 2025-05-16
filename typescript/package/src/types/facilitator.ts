import { PaymentRequirements } from "./protocol";

type FacilitatorRequest = {
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
};

type FacilitatorResponse<T> = {
  data: T | null;
  error?: string;
};

type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
  transaction?: string | undefined;
  network?: string | undefined;
  payer?: string | undefined;
};

type VerifyResponse = {
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

export {
  FacilitatorRequest,
  FacilitatorResponse,
  SettleResponse,
  VerifyResponse,
};
