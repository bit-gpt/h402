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
  }
}

export interface Coin {
  id: string;
  name: string;
  icon: string;
  paymentMethod?: PaymentMethod;
}

export interface Network {
  id: string;
  name: string;
  icon: string;
  coins: Coin[];
}

export interface PaymentMethod {
  namespace?: string;
  networkId?: string;
  scheme?: string;
  amountRequired?: string | number | bigint;
  amountRequiredFormat?: string;
  tokenType?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  description?: string;
  payToAddress?: string;
  [key: string]: any;
}

export interface PaymentUIProps {
  prompt: string;
  returnUrl?: string;
  paymentRequirements?: PaymentMethod[] | PaymentMethod;
}

export type PaymentStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "approving"
  | "processing"
  | "success"
  | "error"
  | "facilitator_error";

export interface PaymentButtonProps {
  amount: string;
  paymentRequirements?: any;
  onSuccess?: (paymentHeader: string, txHash: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  prompt?: string;
}
