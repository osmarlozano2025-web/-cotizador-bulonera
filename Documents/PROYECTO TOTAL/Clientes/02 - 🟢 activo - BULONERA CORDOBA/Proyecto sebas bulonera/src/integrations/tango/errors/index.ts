import type { TangoIntegrationFailureType } from "../types";
import type { SafeJsonValue } from "@/domain/shared/types";
import type { ISODateString } from "@/types/identity";

export interface TangoIntegrationError {
  readonly code: string;
  readonly type: TangoIntegrationFailureType;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: SafeJsonValue;
  readonly externalCode?: string;
  readonly occurredAt: ISODateString;
}

export function createTangoIntegrationError(
  code: string,
  type: TangoIntegrationFailureType,
  message: string,
  retryable: boolean,
  details?: SafeJsonValue,
  externalCode?: string,
): TangoIntegrationError {
  return {
    code,
    type,
    message,
    retryable,
    ...(details === undefined ? {} : { details }),
    ...(externalCode === undefined ? {} : { externalCode }),
    occurredAt: new Date().toISOString(),
  };
}
