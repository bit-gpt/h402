import { NextRequest } from "next/server";
import { createSolanaRpc } from "@solana/kit";

// Create a server-side RPC client with the QuickNode URL
const SOLANA_RPC_URL = process.env.SOLANA_MAINNET_RPC_URL;

if (!SOLANA_RPC_URL) {
  console.error("SOLANA_MAINNET_RPC_URL environment variable is not set");
}

const rpc = createSolanaRpc(SOLANA_RPC_URL as string);

// Allow only specific methods to prevent abuse
const ALLOWED_METHODS = new Set([
  "getLatestBlockhash",
  "getSignatureStatuses",
  "sendTransaction",
]);

// Custom replacer function to handle BigInt serialization
const bigIntReplacer = (_key: string, value: unknown) => {
  // Convert BigInt to string with 'n' suffix to maintain type information
  return typeof value === "bigint" ? value.toString() : value;
};

export async function POST(req: NextRequest) {
  try {
    const { method, params = [] } = await req.json() as {
      method: string;
      params?: unknown[];
    };

    console.log(`Solana RPC proxy: ${method}`, params);

    if (!ALLOWED_METHODS.has(method)) {
      return Response.json(
        { error: `Method not allowed: ${method}` },
        { status: 400 }
      );
    }

    // Forward the request to the RPC endpoint
    // @ts-expect-error - Dynamic method call is safe because we check against ALLOWED_METHODS
    const result = await rpc[method](...params).send();
    
    console.log(`Solana RPC proxy result for ${method}:`, result);
    
    // Use the custom replacer function to handle BigInt values
    return new Response(JSON.stringify(result, bigIntReplacer), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Solana RPC proxy error:", error);
    return Response.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
