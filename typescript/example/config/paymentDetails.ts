import { PaymentDetails } from "@bit-gpt/h402/types";

/**
 * Hardcoded payment details for testing
 * Chain: BSC
 */
export const paymentDetails: PaymentDetails = {
  scheme: "exact",
  namespace: "eip155",
  networkId: "56",
  amountRequired: 0.01,
  amountRequiredFormat: "formatted",
  tokenAddress: "0x55d398326f99059ff775485246999027b3197955",
  resource: "image-generation",
  description: "Access to generated images",
  mimeType: "application/json",
  outputSchema: null,
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  estimatedProcessingTime: 60,
  extra: null,
};

/**
 * Solana payment configuration
 * Chain: Solana Mainnet
 */
export const solanaPaymentDetails = {
  scheme: "exact",
  namespace: "solana",
  networkId: "mainnet",
  amountRequired: 0.001,
  amountRequiredFormat: "formatted" as const,
  tokenAddress: "11111111111111111111111111111111", // System Program ID for native SOL
  resource: "solana-image-generation",
  description: "Generate AI image with Solana",
  mimeType: "application/json",
  outputSchema: null,
  payToAddress: "4pX5LbCK85Sf6iLXMwUodo2f5rvQKAofyhANT6TUwG3f",
  estimatedProcessingTime: 5,
  extra: null,
};
