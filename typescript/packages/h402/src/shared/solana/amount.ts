export function convertAmountToSmallestUnit(
  amount: number | string | bigint,
  decimals: number,
  format: "humanReadable" | "smallestUnit" = "smallestUnit"
): bigint {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error("Decimals must be a non-negative integer");
  }

  if (typeof amount === "bigint") {
    return format === "smallestUnit" ? amount : amount * BigInt(10 ** decimals);
  }

  if (format === "smallestUnit") {
    const amountStr = String(amount);
    if (!/^-?\d+\.?\d*$/.test(amountStr)) {
      throw new Error("Invalid amount format");
    }
    const [whole] = amountStr.split(".");
    return BigInt(whole);
  }

  const amountStr = String(amount);
  
  if (!/^-?\d+\.?\d*$/.test(amountStr)) {
    throw new Error("Invalid amount format");
  }

  const [whole = "0", fraction = ""] = amountStr.split(".");
  
  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, "0");
  const smallestUnitStr = whole + paddedFraction;
  
  return BigInt(smallestUnitStr);
}