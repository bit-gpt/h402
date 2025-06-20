/**
 * Well-known token addresses and constants for the h402 project
 */

// Stablecoin token addresses
export const STABLECOIN_ADDRESSES = {
  USDT_BSC: "0x55d398326f99059ff775485246999027b3197955",
  USDC_SOLANA: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const;

// Native token addresses (special addresses for native tokens)
export const NATIVE_TOKEN_ADDRESSES = {
  BNB_BSC: "0x0000000000000000000000000000000000000000", // Special address for native BNB
  SOL_SOLANA: "11111111111111111111111111111111", // System Program ID for native SOL
} as const;

// Stablecoin symbols
export const STABLECOIN_SYMBOLS = ["USDT", "USDC"] as const;

// All known stablecoin addresses (for easy checking)
export const ALL_STABLECOIN_ADDRESSES = Object.values(STABLECOIN_ADDRESSES);

// Type definitions
export type StablecoinAddress = typeof STABLECOIN_ADDRESSES[keyof typeof STABLECOIN_ADDRESSES];
export type NativeTokenAddress = typeof NATIVE_TOKEN_ADDRESSES[keyof typeof NATIVE_TOKEN_ADDRESSES];
export type StablecoinSymbol = typeof STABLECOIN_SYMBOLS[number];

/**
 * Check if a token address is a known stablecoin
 */
export function isStablecoinAddress(address: string): boolean {
  return ALL_STABLECOIN_ADDRESSES.includes(address as StablecoinAddress);
}

/**
 * Check if a token symbol is a known stablecoin
 */
export function isStablecoinSymbol(symbol: string): boolean {
  return STABLECOIN_SYMBOLS.includes(symbol.toUpperCase() as StablecoinSymbol);
}
