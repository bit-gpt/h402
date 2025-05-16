import { PaymentMethod } from "@/types/payment";

/**
 * Parses payment requirements from a URL parameter string
 * Handles various formats: array, single object, or object with numeric keys
 */
export function parsePaymentRequirements(
  paymentRequirementsParam: string | null
): PaymentMethod[] | undefined {
  if (!paymentRequirementsParam) return undefined;

  try {
    const decodedDetails = JSON.parse(
      decodeURIComponent(paymentRequirementsParam)
    );
    console.log("Decoded payment details:", decodedDetails);

    // Handle different formats: array, single object, or object with numeric keys
    if (Array.isArray(decodedDetails)) {
      // It's already an array
      return decodedDetails;
    } else if (decodedDetails && typeof decodedDetails === "object") {
      // Check if it's an object with numeric keys (like {"0": {...}, "1": {...}})
      if (Object.keys(decodedDetails).some((key) => !isNaN(Number(key)))) {
        // Convert object with numeric keys to array
        return Object.values(decodedDetails);
      } else {
        // It's a single object
        return [decodedDetails];
      }
    }

    // Fallback to empty array if format is unexpected
    return [];
  } catch (error) {
    console.error("Error parsing payment details:", error);
    return undefined;
  }
}
