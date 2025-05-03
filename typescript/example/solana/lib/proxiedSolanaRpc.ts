import { createSolanaRpc } from "@solana/kit";

/**
 * Custom RPC client that proxies requests through a Next.js API route
 * to avoid exposing auth tokens in the browser
 */

// Create a proxy RPC client that forwards requests to our API route
export function createProxiedSolanaRpc(): Pick<ReturnType<typeof createSolanaRpc>, 'getLatestBlockhash' | 'getSignatureStatuses' | 'sendTransaction'> {
  const proxyEndpoint = "/api/solana-rpc";

  // Define the methods we need to support
  type SupportedMethods = 'getLatestBlockhash' | 'getSignatureStatuses' | 'sendTransaction';
  
  // Create a proxy that intercepts all method calls
  return new Proxy({} as any, {
    get(_, methodName: string) {
      // Only handle methods we support
      if (['getLatestBlockhash', 'getSignatureStatuses', 'sendTransaction'].includes(methodName)) {
        // Return a function that matches the expected signature for each method
        return (...args: any[]) => ({
          send: async () => {
            const response = await fetch(proxyEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                method: methodName,
                params: args,
              }),
            });

            if (!response.ok) {
              throw new Error(`RPC error: ${response.statusText}`);
            }

            return response.json();
          },
        });
      }
      
      // Return undefined for unsupported methods
      return undefined;
    },
  }) as Pick<ReturnType<typeof createSolanaRpc>, SupportedMethods>;
}
