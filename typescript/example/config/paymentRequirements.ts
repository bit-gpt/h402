import { PaymentRequirements } from "@bit-gpt/h402/types";

export const evmPaymentRequirementsUSDTonBSC: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
  tokenType: "ERC20",
  tokenDecimals: 18,
  tokenSymbol: "USDT",
  amountRequired: 0.01, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "56", // BSC Chain ID
  description: "Access to generated images (EVM)",
  resource: "image-generation",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
};

// EVM native token payment option (BNB)
export const evmNativePaymentRequirements: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x0000000000000000000000000000000000000000", // Special address for native token
  tokenType: "NATIVE",
  tokenDecimals: 18,
  tokenSymbol: "BNB",
  amountRequired: 0.0001, // 0.0001 BNB
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "56", // BSC Chain ID
  description: "Access to generated images with BNB",
  resource: "image-generation-bnb",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
};

// Solana payment option (native SOL)
export const solanaNativePaymentRequirements: PaymentRequirements = {
  namespace: "solana",
  tokenAddress: "11111111111111111111111111111111", // System Program ID for native SOL
  tokenType: "NATIVE",
  tokenDecimals: 9,
  tokenSymbol: "SOL",
  amountRequired: 100000, // 0.0001 SOL in lamports
  amountRequiredFormat: "smallestUnit", // Amount is in lamports
  payToAddress: "4pX5LbCK85Sf6iLXMwUodo2f5rvQKAofyhANT6TUwG3f",
  networkId: "mainnet",
  description: "Generate AI image with Solana",
  resource: "solana-image-generation",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
};

// Solana SPL token payment option (example with USDC)
export const solanaSplPaymentRequirementsUSDC: PaymentRequirements = {
  namespace: "solana",
  tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  tokenType: "SPL",
  tokenDecimals: 6,
  tokenSymbol: "USDC",
  amountRequired: 10000, // 0.01 USDC in smallest units (6 decimals)
  amountRequiredFormat: "smallestUnit", // Amount is in smallest units
  payToAddress: "4pX5LbCK85Sf6iLXMwUodo2f5rvQKAofyhANT6TUwG3f",
  networkId: "mainnet",
  description: "Generate AI image with USDC on Solana",
  resource: "solana-image-generation-usdc",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
};

export const imageGenerationPaymentRequirements: PaymentRequirements[] = [
  evmPaymentRequirementsUSDTonBSC,
  solanaNativePaymentRequirements,
  solanaSplPaymentRequirementsUSDC,
  evmNativePaymentRequirements,
];
