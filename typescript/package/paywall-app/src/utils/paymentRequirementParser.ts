import type { EnrichedPaymentRequirements } from "@bit-gpt/h402/types";

/**
 * Parses payment requirements from a URL parameter string
 * Convert to array
 */
export function parsePaymentRequirements(
  paymentRequirementsParam: string | null
): EnrichedPaymentRequirements[] | undefined {
  if (!paymentRequirementsParam) return undefined;

  try {
    const decodedDetails = JSON.parse(
      decodeURIComponent(paymentRequirementsParam)
    );
    if (Object.keys(decodedDetails).some((key) => !isNaN(Number(key)))) {
      // Convert object with numeric keys to array
      return Object.values(decodedDetails);
    } else {
      // It's a single object
      return [decodedDetails];
    }
  } catch (error) {
    console.error("Error parsing payment details:", error);
    return undefined;
  }
}
