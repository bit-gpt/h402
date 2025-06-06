import { z } from "zod";

// Constants
const EvmAddressRegex = /^0x[0-9a-fA-F]{40}$/;
const HexEncoded64ByteRegex = /^0x[0-9a-fA-F]{64}$/;
const EvmSignatureRegex = /^0x[0-9a-fA-F]{130}$/;
const HexRegex = /^0x[0-9a-fA-F]*$/; // For general hex validation

// Base Hex schema for reuse
const HexSchema = z.string().regex(HexRegex);

// Parameter schemas
const EvmAuthorizationParametersSchema = z.object({
  from: z.string().regex(EvmAddressRegex),
  to: z.string().regex(EvmAddressRegex),
  value: z.bigint(),
  validAfter: z.bigint(),
  validBefore: z.bigint(),
  nonce: z.string().regex(HexEncoded64ByteRegex),
  version: z.string(),
});
export type EvmAuthorizationParameters = z.infer<
  typeof EvmAuthorizationParametersSchema
>;

const EvmSignAndSendTransactionParametersSchema = z.object({
  from: z.string().regex(EvmAddressRegex),
  to: z.string().regex(EvmAddressRegex),
  value: z.bigint(),
  data: HexSchema,
  nonce: z.string().regex(HexEncoded64ByteRegex),
});
export type EvmSignAndSendTransactionParameters = z.infer<
  typeof EvmSignAndSendTransactionParametersSchema
>;

const EvmAuthorizationPayloadSchema = z.object({
  type: z.literal("authorization"),
  signature: z.string().regex(EvmSignatureRegex),
  authorization: EvmAuthorizationParametersSchema,
});
export type EvmAuthorizationPayload = z.infer<
  typeof EvmAuthorizationPayloadSchema
>;

const EvmSignAndSendTransactionPayloadSchema = z.object({
  type: z.literal("signAndSendTransaction"),
  signedMessage: HexSchema,
  transactionHash: z.string().regex(HexEncoded64ByteRegex),
});
export type EvmSignAndSendTransactionPayload = z.infer<
  typeof EvmSignAndSendTransactionPayloadSchema
>;

// Updated ExactEvmPayloadSchema as discriminated union
export const ExactEvmPayloadSchema = z.discriminatedUnion("type", [
  EvmAuthorizationPayloadSchema,
  EvmSignAndSendTransactionPayloadSchema,
]);

export type ExactEvmPayload = z.infer<typeof ExactEvmPayloadSchema>;

// Export individual schemas if needed
export {
  EvmAuthorizationPayloadSchema,
  EvmSignAndSendTransactionPayloadSchema,
  EvmAuthorizationParametersSchema,
  EvmSignAndSendTransactionParametersSchema,
};
