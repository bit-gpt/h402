import {address, GetTransactionApi} from "@solana/kit";
import {MEMO_PROGRAM_ADDRESS} from "@solana-program/memo";

/**
 * Extract memo data from a Solana transaction
 * Looks for instructions using the Memo Program
 */
export function extractMemoFromTransaction(
  transaction: ReturnType<GetTransactionApi["getTransaction"]>
): string | null {
  if (!transaction || !transaction.meta || !transaction.transaction) {
    return null;
  }

  try {
    const message = transaction.transaction.message;
    const memoProgramId = address(MEMO_PROGRAM_ADDRESS);

    const instructions = message.instructions as any[];
    const accountKeys = message.accountKeys as any[];

    // Look for any instruction that uses the Memo Program
    for (let i = 0; i < instructions.length; i++) {
      const ix = instructions[i];
      if (!ix || typeof ix.programIdIndex !== "number") continue;

      const programIdIndex = ix.programIdIndex;

      // Get the program ID
      if (programIdIndex >= accountKeys.length) continue;
      const programId = accountKeys[programIdIndex];

      if (!programId || typeof programId.toString !== "function") continue;

      // Check if this instruction uses the Memo Program
      if (programId.toString() === memoProgramId.toString()) {
        // Decode the memo data
        if (ix.data) {
          try {
            // Memo data is UTF-8 encoded
            const dataBuffer =
              typeof ix.data === "string"
                ? Buffer.from(ix.data, "base64")
                : Buffer.from(ix.data);
            return dataBuffer.toString("utf8");
          } catch (e) {
            console.error("Failed to decode memo data:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting memo from transaction:", error);
  }

  return null;
}

/**
 * Validate that a memo contains the expected resource ID
 */
export function validateMemo(
  memo: string | null | undefined,
  resourceId: string
): boolean {
  if (!memo) return false;

  // Check if memo starts with the resource ID
  // Format can be either just the resourceId or resourceId:nonce
  return memo === resourceId || memo.startsWith(`${resourceId}:`);
}
