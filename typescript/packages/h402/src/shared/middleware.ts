import { safeBase64Decode } from "@bit-gpt/h402/shared";
import { Address, Hex } from "viem";
import { Network } from "../types";

/**
 * Decodes the X-PAYMENT-RESPONSE header
 *
 * @param header - The X-PAYMENT-RESPONSE header to decode
 * @returns The decoded payment response
 */
export function decodeXPaymentResponse(header: string) {
  const decoded = safeBase64Decode(header);
  return JSON.parse(decoded) as {
    success: boolean;
    transaction: Hex;
    network: Network;
    payer: Address;
  };
}
