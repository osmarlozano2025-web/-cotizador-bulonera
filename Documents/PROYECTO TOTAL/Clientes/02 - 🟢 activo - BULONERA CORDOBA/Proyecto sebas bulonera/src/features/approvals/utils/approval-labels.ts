import type { AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";

export function getApprovalStatusLabel(status: AuthorizationRequestStatus): string {
  const labels: Record<AuthorizationRequestStatus, string> = {
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
  };

  return labels[status];
}

export function getApprovalTypeLabel(type: AuthorizationRequestType): string {
  const labels: Record<AuthorizationRequestType, string> = {
    discountOverride: "Sobrescritura de descuento",
    clientDebt: "Deuda de cliente",
    creditLimit: "Límite de crédito",
    manualPrice: "Precio manual",
    blockedClient: "Cliente bloqueado",
    commercialException: "Excepción comercial",
  };

  return labels[type];
}

