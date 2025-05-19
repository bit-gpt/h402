"use client";

import { Suspense } from "react";
import { SelectedWalletAccountContextProvider } from "@/solana/context/SelectedWalletAccountContextProvider";
import PaywallContent from "./PaywallContent";
import LoadingState from "./LoadingState";

export default function PaywallPage() {
  return (
    <SelectedWalletAccountContextProvider>
      <Suspense fallback={<LoadingState />}>
        <PaywallContent />
      </Suspense>
    </SelectedWalletAccountContextProvider>
  );
}
