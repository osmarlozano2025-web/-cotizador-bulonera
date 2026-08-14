import type { Client, ClientDebt, ClientFinancialSnapshot } from "@/domain/client/client";
import type { CreditCondition } from "@/domain/client/types";
import type { AccountDetailData, AccountEvaluation, AccountState } from "../types";

export function calculateCreditAvailable(creditLimit: number, currentBalance: number): number {
  return Math.round((creditLimit - currentBalance) * 100) / 100;
}

export function calculateAccountState(input: {
  readonly blocked: boolean;
  readonly overdueDebt: number;
  readonly currentBalance: number;
  readonly creditLimit: number;
  readonly underReview: boolean;
}): AccountState {
  if (input.blocked) {
    return "blocked";
  }

  if (input.currentBalance < 0) {
    return "creditBalance";
  }

  if (input.overdueDebt > 0) {
    return "overdue";
  }

  if (input.currentBalance > input.creditLimit) {
    return "exceededCreditLimit";
  }

  if (input.underReview) {
    return "underReview";
  }

  return "current";
}

export function calculateCreditCondition(state: AccountState, pendingApproval: boolean): CreditCondition {
  if (state === "blocked") {
    return "blocked";
  }

  if (state === "overdue" || state === "exceededCreditLimit") {
    return "restricted";
  }

  if (state === "underReview" || pendingApproval) {
    return "review";
  }

  return "normal";
}

export function buildDebtSnapshot(
  client: Client,
  currentBalance: number,
  overdueDebt: number,
  daysPastDue: number,
  blocked: boolean,
  lastUpdatedAt: string,
): ClientDebt {
  return {
    clientId: client.id,
    totalDebt: { amount: Math.max(0, currentBalance), currency: client.creditLimit.currency },
    overdueDebt: { amount: Math.max(0, overdueDebt), currency: client.creditLimit.currency },
    creditLimit: { amount: client.creditLimit.amount, currency: client.creditLimit.currency },
    daysPastDue,
    isBlocked: blocked,
    lastUpdatedAt,
  };
}

export function buildFinancialSnapshot(
  client: Client,
  accountStatus: AccountState,
  creditCondition: CreditCondition,
  currentBalance: number,
  overdueDebt: number,
  lastUpdatedAt: string,
): ClientFinancialSnapshot {
  const snapshotStatus = accountStatus === "creditBalance" ? "current" : accountStatus;

  return {
    clientId: client.id,
    accountStatus: snapshotStatus,
    creditCondition,
    currentDebt: { amount: Math.max(0, currentBalance), currency: client.creditLimit.currency },
    overdueDebt: { amount: Math.max(0, overdueDebt), currency: client.creditLimit.currency },
    creditLimit: { amount: client.creditLimit.amount, currency: client.creditLimit.currency },
    lastUpdatedAt,
  };
}

export function evaluateAccount(detail: AccountDetailData): AccountEvaluation {
  const reasons: string[] = [];

  if (detail.blocked) {
    reasons.push("El cliente se encuentra bloqueado comercialmente.");
  }

  if (detail.accountStatus === "overdue") {
    reasons.push("Existe deuda vencida pendiente de regularizar.");
  }

  if (detail.accountStatus === "exceededCreditLimit") {
    reasons.push("El límite de crédito fue superado.");
  }

  if (detail.accountStatus === "underReview") {
    reasons.push("La cuenta está bajo revisión comercial.");
  }

  if (detail.hasPendingApproval) {
    reasons.push("Hay una autorización pendiente asociada a la cuenta.");
  }

  if (detail.accountStatus === "creditBalance") {
    reasons.push("La cuenta tiene saldo a favor.");
  }

  const canOperate = detail.accountStatus === "current" || detail.accountStatus === "creditBalance";
  const riskLevel = detail.blocked || detail.accountStatus === "overdue" || detail.accountStatus === "exceededCreditLimit"
    ? "high"
    : detail.hasPendingApproval || detail.accountStatus === "underReview"
      ? "medium"
      : "low";

  return {
    canOperate,
    label: canOperate ? "Puede operar" : "Requiere revisión",
    recommendation: canOperate
      ? "La cuenta puede seguir operando normalmente."
      : "Conviene revisar la cuenta antes de autorizar nuevas operaciones.",
    reasons,
    riskLevel,
  };
}
