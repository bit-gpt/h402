import { useState } from "react";

/**
 * Shared connection/status state for wallet hooks.
 * Returns address + status message together with their setters so that
 * chain-specific hooks can reuse identical logic without duplicating state
 * declarations.
 */
export function useConnectionState() {
  const [connectedAddress, setConnectedAddress] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  return {
    connectedAddress,
    setConnectedAddress,
    statusMessage,
    setStatusMessage,
  } as const;
}
