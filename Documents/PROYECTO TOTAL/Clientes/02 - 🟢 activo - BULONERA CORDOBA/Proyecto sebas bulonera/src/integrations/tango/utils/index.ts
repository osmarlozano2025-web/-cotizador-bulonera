import type { TangoProvider, TangoSyncJobStatus } from "../types";
import type { TangoIntegrationError } from "../errors";

export function maskSensitiveValue(value: string): string {
  if (value.length <= 4) {
    return "****";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function sanitizeIntegrationPayload<TPayload>(payload: TPayload): TPayload {
  return payload;
}

export function sanitizeIntegrationError(error: TangoIntegrationError): TangoIntegrationError {
  return {
    ...error,
    ...(error.details === undefined ? {} : { details: error.details }),
  };
}

export function getTangoProviderLabel(provider: TangoProvider): string {
  switch (provider) {
    case "mock":
      return "Mock";
    case "api":
      return "API";
    case "webService":
      return "Web Service";
    case "sdk":
      return "SDK";
    case "file":
      return "Archivos";
    case "localConnector":
      return "Conector local";
    case "disabled":
      return "Deshabilitado";
  }
}

export function getTangoJobStatusLabel(status: TangoSyncJobStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "processing":
      return "Procesando";
    case "success":
      return "Sincronizado";
    case "failed":
      return "Error";
    case "retrying":
      return "Reintentando";
    case "cancelled":
      return "Cancelado";
    case "blocked":
      return "Bloqueado";
    case "notConfigured":
      return "No configurado";
  }
}
