import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

export class SpacetimeDBError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "SpacetimeDBError";
  }
}

export const SpacetimeDBErrorCodes = {
  CONNECTION_ERROR: "CONNECTION_ERROR",
  SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR",
  REDUCER_ERROR: "REDUCER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
} as const;

export type SpacetimeDBErrorCode = typeof SpacetimeDBErrorCodes[keyof typeof SpacetimeDBErrorCodes];

export function handleSpacetimeDBError(error: unknown): SpacetimeDBError {
  if (error instanceof SpacetimeDBError) {
    return error;
  }

  // Handle unknown errors
  if (error instanceof Error) {
    return new SpacetimeDBError(
      error.message,
      SpacetimeDBErrorCodes.REDUCER_ERROR,
      error
    );
  }

  return new SpacetimeDBError(
    "An unknown error occurred",
    SpacetimeDBErrorCodes.REDUCER_ERROR,
    error
  );
}

export function showSpacetimeDBError(error: unknown): void {
  const spacetimeError = handleSpacetimeDBError(error);
  
  showToast({
    title: "Error",
    description: spacetimeError.message,
    variant: "error",
    duration: DEFAULT_TOAST_DURATION,
  });
}

export async function withSpacetimeDBErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage = "Operation failed"
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const spacetimeError = handleSpacetimeDBError(error);
    showSpacetimeDBError(spacetimeError);
    throw spacetimeError;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
} 