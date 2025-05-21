"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Paywall from "@/components/Paywall";
import LoadingState from "./LoadingState";
import { parsePaymentRequirements } from "@/utils/paymentRequirementParser";
import { EnrichedPaymentRequirements } from "@bit-gpt/h402/types";

export default function PaywallContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const paymentRequirementsParam = searchParams.get("requirements");
  const promptParam = searchParams.get("prompt");

  const [paymentRequirements, setPaymentRequirements] = useState<
    EnrichedPaymentRequirements | EnrichedPaymentRequirements[] | undefined
  >(undefined);

  // Parse payment details from URL parameter if available
  useEffect(() => {
    if (paymentRequirementsParam) {
      const parsedRequirements = parsePaymentRequirements(
        paymentRequirementsParam
      );
      setPaymentRequirements(parsedRequirements);
      console.log("Parsed payment details:", parsedRequirements);
    }
  }, [paymentRequirementsParam]);

  // Show loading state while payment requirements are being loaded
  if (paymentRequirementsParam && !paymentRequirements) {
    return <LoadingState message="Loading Payment Options" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[800px] mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Complete Payment to Continue
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
          Connect your wallet and pay a small fee to generate your AI image.
        </p>

        <Paywall
          prompt={promptParam || ""}
          returnUrl={returnUrl || ""}
          paymentRequirements={paymentRequirements}
        />
      </div>
    </div>
  );
}
