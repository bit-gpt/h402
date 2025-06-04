import type { AmountFormat } from "@bit-gpt/h402/types";

/**
 * Format an amount for display with appropriate decimal places
 * @param amount The amount to format
 * @param format The format of the input amount ("smallestUnit" or "humanReadable")
 * @param selectedCoin
 * @param symbol The token symbol to display (e.g., "SOL", "USDT")
 * @returns Formatted string with amount and symbol
 */
export function formatAmountForDisplay({
  amount,
  format,
  symbol,
  decimals,
}: {
  amount: string | number;
  format: AmountFormat;
  symbol: string;
  decimals: number;
}): string {
  let humanReadableAmount = 0;

  if (format === "smallestUnit") {
    const amountNum = Number(amount);
    humanReadableAmount = amountNum / Math.pow(10, decimals);
  } else {
    humanReadableAmount = Number(amount);
  }

  const fixedStr = humanReadableAmount.toFixed(decimals);

  // Remove trailing zeros and decimal point if needed
  // This regex properly removes all trailing zeros after the decimal point
  // and removes the decimal point if there are no significant digits after it
  const cleanedStr = fixedStr.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  return `${cleanedStr} ${symbol}`;
}
