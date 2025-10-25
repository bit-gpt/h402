import { getBase64Encoder, getTransactionDecoder, Transaction } from "@solana/kit";

export function decodeTransactionFromPayload(transactionBase64: string): Transaction {
    try {
      const base64Encoder = getBase64Encoder();
      const transactionBytes = base64Encoder.encode(transactionBase64);
      const transactionDecoder = getTransactionDecoder();
      return transactionDecoder.decode(transactionBytes);
    } catch (error) {
      console.error("[DEBUG-SOLANA-DECODE] Error decoding transaction:", error);
      throw new Error("invalid_exact_solana_payload_transaction");
    }
  }