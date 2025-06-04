import type { EnrichedPaymentRequirements } from "@bit-gpt/h402/types";

declare global {
  interface Window {
    isPhantomInstalled?: boolean;
    phantom?: any;
    ethereum?: Window["ethereum"] & {
      isMetaMask?: boolean;
      isPhantom?: boolean;
      providers?: Array<{
        isMetaMask?: boolean;
        isPhantom?: boolean;
      }>;
    };
    h402?: {
      paymentRequirements?: EnrichedPaymentRequirements[];
    }
  }
}

export interface Coin {
  id: string;
  name: string;
  icon: string;
  paymentRequirements?: EnrichedPaymentRequirements;
}

export interface Network {
  id: string;
  name: string;
  icon: string;
  coins: Coin[];
}

export interface PaymentUIProps {
  paymentRequirements?:
    | EnrichedPaymentRequirements[]
    | EnrichedPaymentRequirements;
}

export type PaymentStatus =
  | "idle"
  | "connecting"
  | "connected"
  // Waiting for payment approval in wallet
  | "approving"
  // Payment has been sent, waiting for confirmation
  | "processing"
  // Payment has enough confirmations
  | "success"
  | "error"
  | "facilitator_error";

export interface PaymentButtonProps {
  amount: string;
  paymentRequirements?: any;
  onSuccess?: (paymentHeader: string, txHash: string) => void;
  onError?: (error: Error) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (paymentStatus: PaymentStatus) => void;
  className?: string;
}
