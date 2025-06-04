import { z } from 'zod';

// Base transaction parameters schema
const SolanaBaseTransactionParametersSchema = z.object({
  from: z.string(),
  to: z.string(),
  value: z.bigint(),
});

// Native transfer parameters schema
const SolanaNativeTransferParametersSchema = SolanaBaseTransactionParametersSchema.extend({
  memo: z.string().optional(),
});

// Token transfer parameters schema
const SolanaTokenTransferParametersSchema = SolanaBaseTransactionParametersSchema.extend({
  mint: z.string(),
  memo: z.string().optional(),
});

// Sign and send transaction parameters schema
const SolanaSignAndSendTransactionParametersSchema = z.object({
  signature: z.string(),
  memo: z.string().optional(),
});

// Sign transaction parameters schema
const SolanaSignTransactionParametersSchema = z.object({
  signedTransaction: z.string(),
  memo: z.string().optional(),
});

// Sign message parameters schema
const SolanaSignMessageParametersSchema = z.object({
  message: z.string(),
  signature: z.string(),
});

// Individual payload schemas
const SolanaNativeTransferPayloadSchema = z.object({
  type: z.literal("nativeTransfer"),
  signature: z.string(),
  transaction: SolanaNativeTransferParametersSchema,
});

const SolanaTokenTransferPayloadSchema = z.object({
  type: z.literal("tokenTransfer"),
  signature: z.string(),
  transaction: SolanaTokenTransferParametersSchema,
});

const SolanaSignAndSendTransactionPayloadSchema = z.object({
  type: z.literal("signAndSendTransaction"),
  signature: z.string(),
  transaction: SolanaSignAndSendTransactionParametersSchema,
});

const SolanaSignTransactionPayloadSchema = z.object({
  type: z.literal("signTransaction"),
  signedTransaction: z.string(),
  transaction: SolanaSignTransactionParametersSchema,
});

const SolanaSignMessagePayloadSchema = z.object({
  type: z.literal("signMessage"),
  signature: z.string(),
  message: SolanaSignMessageParametersSchema,
});

// This is your ExactSolanaPayloadSchema - replace the empty object
export const ExactSolanaPayloadSchema = z.discriminatedUnion("type", [
  SolanaNativeTransferPayloadSchema,
  SolanaTokenTransferPayloadSchema,
  SolanaSignAndSendTransactionPayloadSchema,
  SolanaSignTransactionPayloadSchema,
  SolanaSignMessagePayloadSchema,
]);

export type ExactSolanaPayload = z.infer<typeof ExactSolanaPayloadSchema>;

// Export individual schemas if needed
export {
  SolanaNativeTransferPayloadSchema,
  SolanaTokenTransferPayloadSchema,
  SolanaSignAndSendTransactionPayloadSchema,
  SolanaSignTransactionPayloadSchema,
  SolanaSignMessagePayloadSchema,
};
