import type { Client } from "@/domain/client/client";
import type { AccountStatus, ClientCommercialStatus } from "@/domain/client/types";
import type { Percentage } from "@/domain/shared";
import type { ClientAccountSummary } from "../types";

export function calculateAvailableCredit(creditLimit: number, currentDebt: number): number {
  return Math.max(0, Math.round((creditLimit - currentDebt) * 100) / 100);
}

export function getAccountStateFromClient(
  client: Pick<Client, "accountStatus" | "currentDebt" | "creditLimit" | "overdueDebt">,
): AccountStatus {
  if (client.accountStatus === "blocked") {
    return "blocked";
  }

  if (client.overdueDebt.amount > 0) {
    return "overdue";
  }

  if (client.currentDebt.amount > client.creditLimit.amount) {
    return "exceededCreditLimit";
  }

  return "current";
}

export function getCommercialStatusLabel(status: ClientCommercialStatus): string {
  const labels: Record<ClientCommercialStatus, string> = {
    active: "Activo",
    inactive: "Inactivo",
    blocked: "Bloqueado",
    suspended: "Suspendido",
    pendingApproval: "Pendiente de aprobación",
    underReview: "En revisión",
  };

  return labels[status];
}

export function getAccountStatusLabel(status: AccountStatus): string {
  const labels: Record<AccountStatus, string> = {
    current: "Al día",
    overdue: "Vencida",
    exceededCreditLimit: "Límite superado",
    blocked: "Bloqueada",
    underReview: "En revisión",
  };

  return labels[status];
}

export function getAccountStatusTone(status: AccountStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "current":
      return "success";
    case "overdue":
    case "underReview":
      return "warning";
    case "exceededCreditLimit":
    case "blocked":
      return "danger";
  }
}

export function getCommercialStatusTone(status: ClientCommercialStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "pendingApproval":
    case "underReview":
    case "suspended":
      return "warning";
    case "inactive":
      return "neutral";
    case "blocked":
      return "danger";
  }
}

export function buildClientAccountSummary(
  client: Client,
  accountStatus: AccountStatus,
  ordersCount: number,
  lastPurchaseAt?: string,
  needsAuthorization = false,
  lastUpdatedAt = new Date().toISOString(),
): ClientAccountSummary {
  return {
    clientId: client.id,
    debtTotal: client.currentDebt.amount,
    overdueDebt: client.overdueDebt.amount,
    creditLimit: client.creditLimit.amount,
    creditAvailable: calculateAvailableCredit(client.creditLimit.amount, client.currentDebt.amount),
    daysPastDue: accountStatus === "overdue" || accountStatus === "exceededCreditLimit" ? 15 : 0,
    accountStatus,
    needsAuthorization,
    ordersCount,
    ...(lastPurchaseAt !== undefined ? { lastPurchaseAt } : {}),
    lastUpdatedAt,
  };
}

export function getDiscountOptions(): readonly Percentage[] {
  return [0, 5, 10, 15, 20] as const;
}
