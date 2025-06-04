/**
 * Convert raw error objects from wallet / RPC interactions into concise user-friendly
 * text displayed in the UI. This centralises heuristics so every payment flow shows
 * consistent messages and avoids duplicated `if (error.message.includes(...))`.
 */
export function mapTxError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("user rejected") || msg.includes("user canceled") || msg.includes("user cancelled")) {
      return "Transaction was rejected in wallet";
    }
    if (msg.includes("insufficient") || msg.includes("not enough")) {
      return "Insufficient balance for transaction";
    }
    if (msg.includes("network") || msg.includes("connection")) {
      return "Please check your network connection";
    }
    return err.message; // fall back to original message if not matched
  }
  return "An unknown error occurred";
}
