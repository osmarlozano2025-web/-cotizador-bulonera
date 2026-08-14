import type { TangoIntegrationFailureType } from "../types";

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly intervalMs: number;
  readonly backoffFactor: number;
  readonly retryableErrors: readonly TangoIntegrationFailureType[];
}

export interface RetryDecision {
  readonly retry: boolean;
  readonly nextRetryInMs: number | null;
  readonly reason: string;
}

export function evaluateRetryPolicy(attempts: number, errorType: TangoIntegrationFailureType, policy: RetryPolicy): RetryDecision {
  const retryable = policy.retryableErrors.includes(errorType);
  if (!retryable || attempts >= policy.maxAttempts) {
    return { retry: false, nextRetryInMs: null, reason: "No se reintentará la operación." };
  }

  const delay = Math.round(policy.intervalMs * (policy.backoffFactor ** Math.max(0, attempts - 1)));
  return { retry: true, nextRetryInMs: delay, reason: "La operación puede reintentarse." };
}
