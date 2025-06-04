import { z } from "zod";
import { NetworkSchema } from "../shared";
import {ExactEvmPayloadSchema} from "./evmPayload";
import {ExactSolanaPayloadSchema} from "./solanaPayload";

// Constants
const MixedAddressRegex = /^0x[a-fA-F0-9]{40}|[A-Za-z0-9][A-Za-z0-9-]{0,34}[A-Za-z0-9]$/;

// Enums
export const schemes = ["exact"] as const;
export const x402Versions = [1] as const;
export const ErrorReasons = [
  "insufficient_funds",
  "invalid_exact_evm_payload_authorization_valid_after",
  "invalid_exact_evm_payload_authorization_valid_before",
  "invalid_exact_evm_payload_authorization_value",
  "invalid_exact_evm_payload_signature",
  "invalid_exact_evm_payload_recipient_mismatch",
  "invalid_exact_solana_payload_authorization_valid_after",
  "invalid_exact_solana_payload_authorization_valid_before",
  "invalid_exact_solana_payload_authorization_value",
  "invalid_exact_solana_payload_signature",
  "invalid_exact_solana_payload_recipient_mismatch",
  "invalid_network",
  "invalid_payload",
  "invalid_payment_requirements",
  "invalid_scheme",
  "unsupported_scheme",
  "invalid_h402_version",
  "invalid_transaction_state",
  "unexpected_verify_error",
  "unexpected_settle_error",
] as const;

// h402PaymentRequirements
const NamespaceSchema = z.enum(['evm', 'solana']);
const AmountFormatSchema = z.enum(['humanReadable', 'smallestUnit']);

// Helper function to validate bigint or number
const BigintOrNumberSchema = z.union([
  z.bigint(),
  z.number()
]);

// Base Payment Requirements Schema
export const BasePaymentRequirementsSchema = z.object({
  namespace: NamespaceSchema,
  tokenAddress: z.string(),
  tokenDecimals: z.number().int().optional(),
  tokenSymbol: z.string().optional(),
  amountRequired: BigintOrNumberSchema,
  amountRequiredFormat: AmountFormatSchema,
  payToAddress: z.string(),
  networkId: z.string(),
  description: z.string().optional(),
  resource: z.string().url().optional(),
  scheme: z.enum(schemes),
  mimeType: z.string().optional(),
  outputSchema: z.any().optional(),
  estimatedProcessingTime: z.number().int().optional(),
  extra: z.any().optional(),
  maxAmountRequired: BigintOrNumberSchema.optional(),
  requiredDeadlineSeconds: z.number().int().optional(),
});

// Enriched Payment Requirements Schema
export const EnrichedPaymentRequirementsSchema = BasePaymentRequirementsSchema.extend({
  tokenDecimals: z.number().int(), // Required after enrichment
  tokenSymbol: z.string(), // Required after enrichment
});

// Main export schema
export const PaymentRequirementsSchema = BasePaymentRequirementsSchema;


// Type exports (inferred from schemas)
export type BasePaymentRequirements = z.infer<typeof BasePaymentRequirementsSchema>;
export type EnrichedPaymentRequirements = z.infer<typeof EnrichedPaymentRequirementsSchema>;
export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;
export type Namespace = z.infer<typeof NamespaceSchema>;
export type AmountFormat = z.infer<typeof AmountFormatSchema>;

// h402PaymentPayload
export function createPaymentPayloadSchema<T extends z.ZodType>(payloadSchema: T) {
  return z.object({
    h402Version: z.number().refine(val => x402Versions.includes(val as 1)),
    scheme: z.enum(schemes),
    payload: payloadSchema,
    namespace: NamespaceSchema,
    networkId: z.string(),
    resource: z.string().url().optional(),
  });
}

export const EvmPaymentPayloadSchema = createPaymentPayloadSchema(ExactEvmPayloadSchema);
export const SolanaPaymentPayloadSchema = createPaymentPayloadSchema(ExactSolanaPayloadSchema);
export type EvmPaymentPayload = z.infer<typeof EvmPaymentPayloadSchema>;
export type SolanaPaymentPayload = z.infer<typeof SolanaPaymentPayloadSchema>;

// h402VerifyResponse
export const VerifyResponseSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.enum(ErrorReasons).optional(),
  payer: z.string().regex(MixedAddressRegex).optional(),
  //
  errorMessage: z.string().optional(),
  txHash: z.string().regex(MixedAddressRegex).optional(),
  type: z.enum(["payload", "transaction"] as const).optional()
});
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

// h402SettleResponse
export const SettleResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.string().regex(MixedAddressRegex),
  namespace: NamespaceSchema.optional(),
  errorReason: z.enum(ErrorReasons).optional(),
  payer: z.string().regex(MixedAddressRegex).optional(),
  //
  error: z.string().optional(),
});
export type SettleResponse = z.infer<typeof SettleResponseSchema>;

// h402SupportedPaymentKind
export const SupportedPaymentKindSchema = z.object({
  h402Version: z.number().refine(val => x402Versions.includes(val as 1)),
  scheme: z.enum(schemes),
  network: NetworkSchema,
});
export type SupportedPaymentKind = z.infer<typeof SupportedPaymentKindSchema>;

// h402SupportedPaymentKindsResponse
export const SupportedPaymentKindsResponseSchema = z.object({
  kinds: z.array(SupportedPaymentKindSchema),
});
export type SupportedPaymentKindsResponse = z.infer<typeof SupportedPaymentKindsResponseSchema>;
