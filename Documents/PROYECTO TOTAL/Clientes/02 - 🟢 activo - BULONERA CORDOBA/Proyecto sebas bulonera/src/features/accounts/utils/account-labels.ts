import type { AccountMovementStatus, AccountMovementType, AccountState } from "../types";
import type { CreditCondition } from "@/domain/client/types";

export function getAccountStateLabel(state: AccountState): string {
  const labels: Record<AccountState, string> = {
    current: "Al día",
    overdue: "Vencida",
    exceededCreditLimit: "Límite excedido",
    blocked: "Bloqueada",
    underReview: "En revisión",
    creditBalance: "Saldo a favor",
  };

  return labels[state];
}

export function getCreditConditionLabel(condition: CreditCondition): string {
  const labels: Record<CreditCondition, string> = {
    normal: "Normal",
    review: "En revisión",
    restricted: "Restringida",
    blocked: "Bloqueada",
  };

  return labels[condition];
}

export function getAccountMovementTypeLabel(type: AccountMovementType): string {
  const labels: Record<AccountMovementType, string> = {
    invoice: "Factura",
    payment: "Pago",
    creditNote: "Nota de crédito",
    debitNote: "Nota de débito",
    adjustment: "Ajuste",
  };

  return labels[type];
}

export function getAccountMovementStatusLabel(status: AccountMovementStatus): string {
  const labels: Record<AccountMovementStatus, string> = {
    pending: "Pendiente",
    partiallyPaid: "Parcialmente pagado",
    paid: "Pagado",
    overdue: "Vencido",
    cancelled: "Cancelado",
    applied: "Aplicado",
  };

  return labels[status];
}
