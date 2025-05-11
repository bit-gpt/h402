import { LogContext } from "./types.js";

function logError(context: LogContext, error: unknown, message?: string) {
  const errorInfo =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { error };

  console.error(
    `[${context.service.toUpperCase()}] ${context.operation}${message ? `: ${message}` : ""}`,
    {
      ...context,
      error: errorInfo,
    },
  );
}

export { logError };
