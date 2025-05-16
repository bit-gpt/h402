"use client";

import { ReactNode } from "react";
import { PaymentStatus } from "@/types/payment";

interface PaymentButtonUIProps {
  /**
   * Button text to display
   */
  buttonText: string;
  
  /**
   * Current payment status
   */
  status: PaymentStatus;
  
  /**
   * Error message to display if status is error
   */
  errorMessage?: string | null;
  
  /**
   * Click handler for the button
   */
  onClick: () => void;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Children to render inside the button (optional)
   */
  children?: ReactNode;
}

/**
 * Shared UI component for payment buttons with consistent styling
 */
export default function PaymentButtonUI({
  buttonText,
  status,
  errorMessage,
  onClick,
  disabled = false,
  className = "",
  children,
}: PaymentButtonUIProps) {
  // Determine if the button is in a processing state
  const isProcessing = ["connecting", "approving", "processing"].includes(status);
  
  return (
    <div className="flex flex-col w-full">
      <button
        className={`payment-button ${isProcessing ? "payment-button-processing" : ""} ${status === "success" ? "payment-button-success" : ""} ${className}`}
        onClick={onClick}
        disabled={disabled || isProcessing || status === "success"}
        type="button"
      >
        <div className="flex items-center justify-center">
          {isProcessing && (
            <svg
              className="payment-button-spinner"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          <span className="ml-2">{buttonText}</span>
        </div>
      </button>
      
      {status === "error" && errorMessage && (
        <div className="mt-2 text-red-500 text-sm">{errorMessage}</div>
      )}
      
      {children}
    </div>
  );
}
