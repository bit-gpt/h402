import {
  safeBase64Decode,
  safeBase64Encode,
} from "../../../../shared/base64.js";
import { EvmPaymentPayload } from "../../../../types";

function encodePaymentPayload(payment: EvmPaymentPayload): string {
  const safe = {
    ...payment,
    payload: {
      ...payment.payload,
      ...(payment.payload.type === "authorization" && {
        authorization: {
          ...payment.payload.authorization,
          value: payment.payload.authorization.value.toString(),
          validAfter: payment.payload.authorization.validAfter.toString(),
          validBefore: payment.payload.authorization.validBefore.toString(),
        },
      }),
    },
  };

  return safeBase64Encode(JSON.stringify(safe));
}

function decodePaymentPayload(payment: string): EvmPaymentPayload {
  const decoded = safeBase64Decode(payment);
  const parsed = JSON.parse(decoded);

  const obj = {
    ...parsed,
    payload: {
      ...parsed.payload,
      ...(parsed.payload.type === "authorization" && {
        authorization: {
          ...parsed.payload.authorization,
          value: BigInt(parsed.payload.authorization.value),
          validAfter: BigInt(parsed.payload.authorization.validAfter),
          validBefore: BigInt(parsed.payload.authorization.validBefore),
        },
      }),
    },
  };
  return validatePaymentPayload(obj);
}

function validatePaymentPayload(obj: EvmPaymentPayload): EvmPaymentPayload {
  if (
    !obj ||
    typeof obj !== "object" ||
    !obj.payload ||
    typeof obj.payload !== "object" ||
    !obj.payload.type
  ) {
    throw new Error("Invalid payment payload structure");
  }

  switch (obj.payload.type) {
    case "authorization":
      if (
        !obj.payload.authorization ||
        typeof obj.payload.authorization.value !== "bigint" ||
        typeof obj.payload.authorization.validAfter !== "bigint" ||
        typeof obj.payload.authorization.validBefore !== "bigint" ||
        typeof obj.payload.authorization.nonce !== "string" ||
        typeof obj.payload.authorization.version !== "string" ||
        !obj.payload.signature ||
        !obj.payload.signature.startsWith("0x")
      ) {
        throw new Error("Invalid authorization payload values");
      }
      break;
    case "signAndSendTransaction":
      if (
        !obj.payload.transactionHash ||
        typeof obj.payload.transactionHash !== "string" ||
        !obj.payload.signedMessage ||
        !obj.payload.signedMessage.startsWith("0x")
      ) {
        throw new Error("Invalid sign and send transaction payload values");
      }
      break;

    default:
      throw new Error("Invalid payload type");
  }

  return obj;
}

export { encodePaymentPayload, decodePaymentPayload };
