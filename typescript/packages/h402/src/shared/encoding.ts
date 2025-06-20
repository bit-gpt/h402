/**
 * Converts a string to hex encoding, works in both browser and Node.js environments
 * @param str - The string to convert to hex
 * @returns The hex string (without 0x prefix)
 */
export function stringToHex(str: string): string {
  try {
    // Browser environment
    if (typeof window !== "undefined") {
      let hex = '';
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        const hexValue = charCode.toString(16);
        // Ensure two-digit hex values
        hex += hexValue.padStart(2, '0');
      }
      return hex;
    }
    // Node.js environment
    return Buffer.from(str).toString("hex");
  } catch (error) {
    throw new Error(
      `Failed to convert string to hex: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Converts a hex string to its original string representation
 * @param hex - The hex string to convert (without 0x prefix)
 * @returns The original string
 */
export function hexToString(hex: string): string {
  try {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Browser environment
    if (typeof window !== "undefined") {
      let str = '';
      for (let i = 0; i < cleanHex.length; i += 2) {
        const charCode = parseInt(cleanHex.substring(i, i + 2), 16);
        str += String.fromCharCode(charCode);
      }
      return str;
    }
    // Node.js environment
    return Buffer.from(cleanHex, "hex").toString("utf-8");
  } catch (error) {
    throw new Error(
      `Failed to convert hex to string: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
