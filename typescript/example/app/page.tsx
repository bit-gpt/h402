"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Paywall from "@/components/Paywall";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const base64Payment = searchParams.get("402base64");
  const prompt = searchParams.get("prompt");

  useEffect(() => {
    // If we have a payment and prompt, redirect to the API to generate the image
    if (base64Payment && prompt) {
      router.push(`/api/generate-image?prompt=${encodeURIComponent(prompt)}&402base64=${encodeURIComponent(base64Payment)}`);
    }
  }, [base64Payment, prompt, router]);

  // If we have payment parameters, show loading state
  if (base64Payment && prompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-[800px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
          <p className="text-lg mb-8">
            Generate AI images using the HTTP 402 payment protocol.
          </p>

          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p>Processing your payment and generating your image...</p>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render the Paywall component directly
  return <Paywall />;
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-[800px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
          <p className="text-lg mb-8">
            Generate AI images using the HTTP 402 payment protocol.
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
