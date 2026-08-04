import { AIProviderError } from "./ai-provider.interface";

export interface AICallErrorInfo {
  httpStatus?: number;
  type: "SCHEMA_INVALID" | "TIMEOUT" | "NETWORK" | "PROVIDER_ERROR";
  attempt: number;
  retryAfterMs?: number;
}

export interface RetryPolicy {
  shouldRetry(error: AICallErrorInfo): boolean;
  getDelay(attempt: number, error: AICallErrorInfo): number;
  maxRetries(error: AICallErrorInfo): number;
}

export class AIRetryPolicy implements RetryPolicy {
  shouldRetry(error: AICallErrorInfo): boolean {
    if (error.httpStatus === 400 || error.httpStatus === 401 || error.httpStatus === 403) {
      return false;
    }
    if (error.type === "SCHEMA_INVALID" && error.attempt >= 1) return false;
    return true;
  }

  getDelay(attempt: number, error: AICallErrorInfo): number {
    if (error.httpStatus === 429) {
      return error.retryAfterMs ?? Math.pow(2, attempt) * 2000;
    }
    if (error.type === "TIMEOUT") return 10_000;
    if (error.type === "NETWORK") return Math.pow(2, attempt) * 1000;
    return 5000;
  }

  maxRetries(error: AICallErrorInfo): number {
    if (error.httpStatus === 429) return error.retryAfterMs ? 5 : 0;
    if (error.type === "SCHEMA_INVALID") return 1;
    if (error.type === "TIMEOUT") return 2;
    return 3;
  }
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retryPolicy: RetryPolicy,
  onError?: (error: AIProviderError, attempt: number) => void,
): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error instanceof AIProviderError ? error : new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
        "PROVIDER_ERROR",
      );
      const info: AICallErrorInfo = {
        httpStatus: err.httpStatus,
        type: err.type ?? "PROVIDER_ERROR",
        attempt,
        retryAfterMs: err.retryAfterMs,
      };
      if (!retryPolicy.shouldRetry(info) || attempt > retryPolicy.maxRetries(info)) {
        throw error;
      }
      onError?.(err, attempt);
      await new Promise((r) => setTimeout(r, retryPolicy.getDelay(attempt, info)));
    }
  }
}
