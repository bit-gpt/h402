/**
 * Custom RPC client that proxies requests through a Next.js API route
 * to avoid exposing auth tokens in the browser
 */

// Create a proxy RPC client that forwards requests to our API route
export function createProxiedSolanaRpc() {
  const proxyEndpoint = "/api/solana-rpc";

  // Define the methods we need to support
  const supportedMethods = ['getLatestBlockhash', 'getSignatureStatuses', 'sendTransaction'];
  
  // Create a proxy that intercepts all method calls
  return new Proxy({} as any, {
    get(_, methodName: string) {
      // Only handle methods we support
      if (supportedMethods.includes(methodName)) {
        // Return a function that matches the expected signature for each method
        return (...args: any[]) => ({
          send: async () => {
            console.log(`Proxying RPC call: ${methodName}`, args);
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
      
      // For unsupported methods, return a function that logs and throws an error
      return (...args: any[]) => {
        console.warn(`Unsupported RPC method called: ${String(methodName)}`, args);
        return {
          send: async () => {
            throw new Error(`Unsupported RPC method: ${String(methodName)}`);
          },
        };
      };
    },
  });
}
