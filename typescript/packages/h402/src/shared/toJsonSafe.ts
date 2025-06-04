/**
 * Converts data to a JSON-safe format by handling special cases like BigInt, Date, Map, Set, etc.
 * 
 * @param data - The data to convert to JSON-safe format
 * @param seen - WeakSet to handle circular references (internal use)
 * @returns The JSON-safe version of the data
 * @throws {Error} If the input is not a valid object or array
 */
function toJsonSafe<T extends object>(
  data: T,
  seen: WeakSet<object> = new WeakSet()
): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a valid object or array");
  }

  if (seen.has(data)) {
    return { "[Circular]": true };
  }
  seen.add(data);

  try {
    if (data instanceof Date) {
      return data.toISOString() as unknown as Record<string, unknown>;
    }

    if (data instanceof Set) {
      return toJsonSafe(Array.from(data), seen);
    }

    if (data instanceof Map) {
      return toJsonSafe(Object.fromEntries(data), seen);
    }

    return Object.entries(data).reduce((result, [key, value]) => {
      if (value === undefined || value === null) {
        return result;
      }

      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (typeof value === "bigint") {
        result[key] = value.toString();
      } else if (typeof value === "symbol") {
        result[key] = value.toString();
      } else if (value instanceof Set) {
        result[key] = Array.from(value);
      } else if (value instanceof Map) {
        result[key] = Object.fromEntries(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? toJsonSafe(item, seen)
            : item
        );
      } else if (typeof value === "object") {
        result[key] = toJsonSafe(value, seen);
      } else if (typeof value === "function") {
        result[key] = "[Function]";
      } else {
        result[key] = value;
      }

      return result;
    }, {} as Record<string, unknown>);
  } catch (error) {
    throw new Error(
      `Failed to convert to JSON-safe format: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { toJsonSafe };
