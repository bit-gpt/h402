/**
 * Safely encodes a string to base64 format.
 * 
 * This function works in both browser and Node.js environments by using
 * the appropriate encoding method for each environment. It includes error
 * handling to provide clear error messages if encoding fails.
 * 
 * @param {string} data - The string data to encode to base64
 * @returns {string} The base64 encoded string
 * @throws {Error} If data is empty or if encoding fails
 */
function safeBase64Encode(data: string): string {
  if (!data) {
    throw new Error("Data is required for base64 encoding");
  }

  try {
    if (typeof window !== "undefined") {
      return window.btoa(data);
    }
    return Buffer.from(data).toString("base64");
  } catch (error) {
    throw new Error(
      `Failed to encode data to base64: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Safely decodes a base64 string to its original format.
 * 
 * This function works in both browser and Node.js environments by using
 * the appropriate decoding method for each environment. It includes error
 * handling to provide clear error messages if decoding fails.
 * 
 * @param {string} data - The base64 encoded string to decode
 * @returns {string} The decoded string in UTF-8 format
 * @throws {Error} If data is empty or if decoding fails
 */
function safeBase64Decode(data: string): string {
  if (!data) {
    throw new Error("Data is required for base64 decoding");
  }

  try {
    if (typeof window !== "undefined") {
      return window.atob(data);
    }
    return Buffer.from(data, "base64").toString("utf-8");
  } catch (error) {
    throw new Error(
      `Failed to decode base64 data: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { safeBase64Encode, safeBase64Decode };
