"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface ReturnButtonProps {
  returnUrl: string | null;
  isProcessing: boolean;
  className?: string;
  buttonText?: string;
}

/**
 * A component for handling navigation back to a previous page
 * Uses Next.js router for proper client-side navigation
 */
const ReturnButton: React.FC<ReturnButtonProps> = ({
                                                     returnUrl,
                                                     isProcessing,
                                                     className = "mt-6 text-center",
                                                     buttonText = "Cancel and return",
                                                   }) => {
  const router = useRouter();

  // If no returnUrl is provided, don't render anything
  if (!returnUrl) return null;

  const handleReturn = () => {
    router.push(returnUrl);
  };

  return (
    <div className={className}>
      <button
        onClick={handleReturn}
        className="text-blue-500 hover:text-blue-700 underline"
        disabled={isProcessing}
        type="button"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ReturnButton;
