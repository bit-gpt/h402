import { z } from "zod";

// Sign message parameters schema
const SolanaSignMessageParametersSchema = z.object({
  message: z.string(),
  signature: z.string(),
});

// Individual payload schemas
const SolanaSignAndSendTransactionPayloadSchema = z.object({
  type: z.literal("signAndSendTransaction"),
  signature: z.string(),
});

const SolanaSignTransactionPayloadSchema = z.object({
  type: z.literal("signTransaction"),
  signature: z.string(),
  transaction: z.string(),
});
export type SolanaSignTransactionPayload = z.infer<
  typeof SolanaSignTransactionPayloadSchema
>;

const SolanaSignMessagePayloadSchema = z.object({
  type: z.literal("signMessage"),
  signature: z.string(),
  message: SolanaSignMessageParametersSchema,
});

// This is your ExactSolanaPayloadSchema - replace the empty object
export const ExactSolanaPayloadSchema = z.discriminatedUnion("type", [
  SolanaSignAndSendTransactionPayloadSchema,
  SolanaSignTransactionPayloadSchema,
  SolanaSignMessagePayloadSchema,
]);

export type ExactSolanaPayload = z.infer<typeof ExactSolanaPayloadSchema>;

// Export individual schemas if needed
export {
  SolanaSignAndSendTransactionPayloadSchema,
  SolanaSignTransactionPayloadSchema,
  SolanaSignMessagePayloadSchema,
};
