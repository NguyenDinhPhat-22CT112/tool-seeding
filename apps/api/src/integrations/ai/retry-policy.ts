export type AICallErrorType =
  | "SCHEMA_INVALID"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_ERROR";

export interface AICallError {
  httpStatus?: number;
  type: AICallErrorType;
  attempt: number;
  retryAfterMs?: number;
  message?: string;
}

export interface RetryPolicy {
  shouldRetry(error: AICallError): boolean;
  getDelay(attempt: number, error: AICallError): number;
  maxRetries(error: AICallError): number;
}

export class AIRetryPolicy implements RetryPolicy {
  shouldRetry(error: AICallError): boolean {
    if (error.httpStatus === 400 || error.httpStatus === 401 || error.httpStatus === 403) {
      return false;
    }
    if (error.type === "SCHEMA_INVALID" && error.attempt >= 1) return false;
    return true;
  }

  getDelay(attempt: number, error: AICallError): number {
    if (error.httpStatus === 429) {
      return error.retryAfterMs ?? Math.pow(2, attempt) * 2000;
    }
    if (error.type === "TIMEOUT") return 10_000;
    if (error.type === "NETWORK") return Math.pow(2, attempt) * 1000;
    return 5000;
  }

  maxRetries(error: AICallError): number {
    if (error.httpStatus === 429) return 5;
    if (error.type === "SCHEMA_INVALID") return 1;
    if (error.type === "TIMEOUT") return 2;
    return 3;
  }
}
