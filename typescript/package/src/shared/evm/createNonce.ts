import { Hex } from "../../types/index.js";

const NONCE_BYTES = 32;

/**
 * Creates a cryptographically secure random nonce.
 *
 * A nonce is a random value used to ensure uniqueness in cryptographic operations.
 * This function generates a 32-byte random value using the Web Crypto API.
 *
 * @returns {Hex} A hexadecimal string prefixed with '0x' representing the random nonce
 * @throws {Error} If the random bytes generation fails
 */
function createNonce(): Hex {
  try {
    const randomBytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    // Use browser-compatible approach to convert Uint8Array to hex string
    let hexString = '';
    for (let i = 0; i < randomBytes.length; i++) {
      const hex = randomBytes[i].toString(16).padStart(2, '0');
      hexString += hex;
    }
    console.log("[DEBUG] Generated nonce using browser-compatible approach");
    return `0x${hexString}` as Hex;
  } catch (error) {
    throw new Error(
      `Failed to generate nonce: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { createNonce };
