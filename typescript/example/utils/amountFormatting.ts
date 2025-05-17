/**
 * Utility functions for converting between payment amount formats
 */

/**
 * Convert an amount from smallestUnit to humanReadable format
 * @param amount The amount in smallest unit (e.g., lamports, wei)
 * @param namespace The blockchain namespace ("solana" or "evm")
 * @param tokenAddress Optional token address to determine decimals for EVM tokens
 * @returns The amount in human readable format
 */
export function smallestUnitToHumanReadable(
  amount: string | number,
  namespace: string
): number {
  const amountNum = Number(amount);

  if (namespace === "solana") {
    // 1 SOL = 1,000,000,000 lamports (9 decimal places)
    return amountNum / 1_000_000_000;
  } else if (namespace === "evm") {
    // BSC USDT (0x55d398326f99059ff775485246999027b3197955) actually has 18 decimals
    const decimals = 18;
    return amountNum / Math.pow(10, decimals);
  }

  // Default fallback
  return amountNum;
}

/**
 * Format an amount for display with appropriate decimal places
 * @param amount The amount to format
 * @param namespace The blockchain namespace ("solana" or "evm")
 * @param format The format of the input amount ("smallestUnit" or "humanReadable")
 * @param symbol The token symbol to display (e.g., "SOL", "USDT")
 * @returns Formatted string with amount and symbol
 */
export function formatAmountForDisplay(
  amount: string | number,
  namespace: string,
  format: "smallestUnit" | "humanReadable",
  symbol: string
): string {
  let humanReadableAmount: number;

  if (format === "smallestUnit") {
    humanReadableAmount = smallestUnitToHumanReadable(amount, namespace);
  } else {
    humanReadableAmount = Number(amount);
  }

  // Determine appropriate decimal places based on the token
  let decimalPlaces = 2; // Default
  if (namespace === "solana") {
    decimalPlaces = 9; // SOL has 9 decimal places
  }

  // Format with fixed decimal places first
  const fixedStr = humanReadableAmount.toFixed(decimalPlaces);

  // Remove trailing zeros and decimal point if needed
  // This regex properly removes all trailing zeros after the decimal point
  // and removes the decimal point if there are no significant digits after it
  const cleanedStr = fixedStr.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  return `${cleanedStr} ${symbol}`;
}
