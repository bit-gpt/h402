import { SolanaPaymentPayload } from "../../../types/index.js";
import { safeBase64Decode, safeBase64Encode } from "../../../shared/index.js";

/**
 * Encodes a Solana payment payload to base64
 */
function encodePaymentPayload(payload: SolanaPaymentPayload): string {
  // Create a JSON-safe version by converting any BigInt values to strings
  const safe = {
    ...payload,
    payload: {
      ...payload.payload,
      // Handle any BigInt values if they exist in the future
    },
  };

  return safeBase64Encode(JSON.stringify(safe));
}

/**
 * Decodes a base64 Solana payment payload
 */
function decodePaymentPayload(payment: string): SolanaPaymentPayload {
  const decoded = safeBase64Decode(payment);
  const parsed = JSON.parse(decoded);

  // For now, Solana payloads are simpler than EVM (no BigInt conversions needed)
  return validatePaymentPayload(parsed);
}

/**
 * Validates a Solana payment payload structure
 */
function validatePaymentPayload(obj: any): SolanaPaymentPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid payment payload: not an object");
  }

  if (!obj.payload || typeof obj.payload !== "object") {
    throw new Error("Invalid payment payload: missing or invalid payload");
  }

  if (!obj.payload.type || typeof obj.payload.type !== "string") {
    throw new Error("Invalid payment payload: missing or invalid payload type");
  }

  // Validate based on payload type
  const validTypes = [
    "signAndSendTransaction",
    "signTransaction",
    "signMessage",
  ];
  if (!validTypes.includes(obj.payload.type)) {
    throw new Error(
      `Invalid payment payload: unsupported type ${obj.payload.type}`
    );
  }

  // Validation for signAndSendTransaction type
  if (obj.payload.type === "signAndSendTransaction") {
    if (!obj.payload.signature || typeof obj.payload.signature !== "string") {
      throw new Error(
        "Invalid payment payload: signAndSendTransaction type requires signature field"
      );
    }
  }

  // Validation for signTransaction type
  if (obj.payload.type === "signTransaction") {
    if (!obj.payload.signature || typeof obj.payload.signature !== "string") {
      throw new Error(
        "Invalid payment payload: signTransaction type requires signature field"
      );
    }
    if (
      !obj.payload.transaction ||
      typeof obj.payload.transaction !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signTransaction type requires transaction field"
      );
    }
  }

  // Additional validation for signMessage type
  if (obj.payload.type === "signMessage") {
    if (!obj.payload.signature || typeof obj.payload.signature !== "string") {
      throw new Error(
        "Invalid payment payload: signMessage type requires signature field"
      );
    }
    if (!obj.payload.message || typeof obj.payload.message !== "object") {
      throw new Error(
        "Invalid payment payload: signMessage type requires message object"
      );
    }
    if (
      !obj.payload.message.message ||
      typeof obj.payload.message.message !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.message field"
      );
    }
    if (
      !obj.payload.message.signature ||
      typeof obj.payload.message.signature !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.signature field"
      );
    }
  }

  return obj as SolanaPaymentPayload;
}

/**
 * Validates a Solana address format
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    // Solana addresses are base58 encoded and typically 32-44 characters
    if (
      typeof address !== "string" ||
      address.length < 32 ||
      address.length > 44
    ) {
      return false;
    }

    // Basic base58 character check
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
}

export {
  encodePaymentPayload,
  decodePaymentPayload,
  validatePaymentPayload,
  isValidSolanaAddress,
};
