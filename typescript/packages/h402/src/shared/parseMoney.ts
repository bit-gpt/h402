import { type Money } from "../types";

/**
 * Parses a money input (string or number) into a validated number.
 *
 * - If the input is a string, it strips out all non-numeric characters
 *   except digits, decimal points, and negative signs (e.g., "$1,234.56" → 1234.56).
 * - If the input is already a number, it is converted to a string and re-parsed.
 * - The resulting number must be between 0 and 999999999 (inclusive).
 * - Maximum of 4 decimal places allowed.
 * - Negative values are not allowed.
 * - Scientific notation is not allowed.
 *
 * @param {Money} input - A string or number representing a monetary value.
 * @returns {number} The cleaned and validated numeric value.
 *
 * @throws {Error} If the input is not a string or number.
 * @throws {Error} If the cleaned input cannot be parsed into a valid number.
 * @throws {Error} If the number is outside the accepted range.
 * @throws {Error} If the number has too many decimal places.
 * @throws {Error} If the number is negative.
 * @throws {Error} If the input contains multiple decimal points.
 * @throws {Error} If the input is in scientific notation.
 */
function parseMoney(input: Money): number {
  if (typeof input !== "string" && typeof input !== "number") {
    throw new Error("Invalid input type: must be string or number");
  }

  const inputStr = input.toString();

  if (inputStr.includes("e") || inputStr.includes("E")) {
    throw new Error("Scientific notation is not allowed");
  }

  const cleaned = inputStr.replace(/[^0-9.-]+/g, "");

  if ((cleaned.match(/\./g) || []).length > 1) {
    throw new Error("Multiple decimal points are not allowed");
  }

  if (cleaned.startsWith(".") || cleaned.endsWith(".")) {
    throw new Error("Invalid decimal point placement");
  }

  const num = Number(cleaned);

  if (isNaN(num)) {
    throw new Error("Invalid number format");
  }

  if (num < 0) {
    throw new Error("Negative values are not allowed");
  }

  if (num > 999999999) {
    throw new Error("Money must not exceed 999999999");
  }

  const decimalPlaces = (cleaned.split(".")[1] || "").length;
  if (decimalPlaces > 4) {
    throw new Error("Maximum of 4 decimal places allowed");
  }

  return Number(num.toFixed(4));
}

export { parseMoney };
