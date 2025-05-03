import { createSolanaRpc } from "@solana/kit";

/**
 * Custom RPC client that proxies requests through a Next.js API route
 * to avoid exposing auth tokens in the browser
 */

// Create a proxy RPC client that forwards requests to our API route
export function createProxiedSolanaRpc(): Pick<ReturnType<typeof createSolanaRpc>, 'getLatestBlockhash' | 'getSignatureStatuses' | 'sendTransaction'> {
  const proxyEndpoint = "/api/solana-rpc";

  // This mimics the minimal interface needed by the payment flow and wallet hook
  return {
    getLatestBlockhash: () => ({
      send: async () => {
        const response = await fetch(proxyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "getLatestBlockhash",
            params: [],
          }),
        });

        if (!response.ok) {
          throw new Error(`RPC error: ${response.statusText}`);
        }

        return response.json();
      },
    }),

    getSignatureStatuses: (signatures: unknown[], options?: unknown) => ({
      send: async () => {
        const response = await fetch(proxyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "getSignatureStatuses",
            params: [signatures, options],
          }),
        });

        if (!response.ok) {
          throw new Error(`RPC error: ${response.statusText}`);
        }

        return response.json();
      },
    }),

    sendTransaction: (transaction: string) => ({
      send: async () => {
        const response = await fetch(proxyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "sendTransaction",
            params: [transaction],
          }),
        });

        if (!response.ok) {
          throw new Error(`RPC error: ${response.statusText}`);
        }

        return response.json();
      },
    }),
  };
}
