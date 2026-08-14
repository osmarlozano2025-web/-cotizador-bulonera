import type { AuthorizationRequest, AuthorizationRequestType } from "@/domain/approval/approval";
import type { ClientId, UserId } from "@/domain/shared";
import { getAccountReferenceData, getAccountSeedList } from "../data/mock-accounts";
import { buildDebtSnapshot, buildFinancialSnapshot, calculateAccountState, calculateCreditAvailable, calculateCreditCondition, evaluateAccount } from "../utils/account-calculations";
import { getAccountStateLabel } from "../utils/account-labels";
import { createApproval as createApprovalService, getApprovalByClientId as getApprovalByClientIdService } from "@/features/approvals/services/approval-service";
import type {
  AccountActionResult,
  AccountAdjustmentInput,
  AccountApprovalResult,
  AccountDetailData,
  AccountEvaluation,
  AccountListQuery,
  AccountListResult,
  AccountMovement,
  AccountOverdueDocument,
  AccountReferenceData,
  AccountSummary,
} from "../types";
import type { AccountRepository } from "./account-repository";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

const asId = <T extends string>(value: string): T => value as T;
const REQUESTED_BY_USERS: readonly UserId[] = [
  asId<UserId>("user-admin-1"),
  asId<UserId>("user-supervisor-1"),
  asId<UserId>("user-seller-1"),
];
function cloneMovement(movement: AccountMovement): AccountMovement {
  return { ...movement };
}

function cloneOverdueDocument(document: AccountOverdueDocument): AccountOverdueDocument {
  return { ...document };
}

function cloneSummary(summary: AccountSummary): AccountSummary {
  return {
    ...summary,
    debtSnapshot: { ...summary.debtSnapshot, totalDebt: { ...summary.debtSnapshot.totalDebt }, overdueDebt: { ...summary.debtSnapshot.overdueDebt }, creditLimit: { ...summary.debtSnapshot.creditLimit } },
    financialSnapshot: { ...summary.financialSnapshot, currentDebt: { ...summary.financialSnapshot.currentDebt }, overdueDebt: { ...summary.financialSnapshot.overdueDebt }, creditLimit: { ...summary.financialSnapshot.creditLimit } },
    ...(summary.approvalRequest !== undefined ? { approvalRequest: { ...summary.approvalRequest } } : {}),
  };
}

function cloneDetail(detail: AccountDetailData): AccountDetailData {
  return {
    ...cloneSummary(detail),
    client: {
      ...detail.client,
      ...(detail.client.assignedSellerId !== undefined ? { assignedSellerId: detail.client.assignedSellerId } : {}),
      creditLimit: { ...detail.client.creditLimit },
      currentDebt: { ...detail.client.currentDebt },
      overdueDebt: { ...detail.client.overdueDebt },
      addresses: detail.client.addresses.map((address) => ({ ...address })),
    },
    movements: detail.movements.map((movement) => cloneMovement(movement)),
    overdueDocuments: detail.overdueDocuments.map((document) => cloneOverdueDocument(document)),
    evaluation: { ...detail.evaluation, reasons: [...detail.evaluation.reasons] },
  };
}

async function mergeApprovalSnapshot(detail: AccountDetailData): Promise<AccountDetailData> {
  const approval = await getApprovalByClientIdService(detail.client.id);
  if (approval === null) {
    const cloned = cloneDetail(detail);
    const { approvalRequest, approvalStatus, approvalType, approvalNumber, ...rest } = cloned;
    void approvalRequest;
    void approvalStatus;
    void approvalType;
    void approvalNumber;
    return {
      ...rest,
      hasPendingApproval: false,
    };
  }

  const approvalStatus = approval.request.status;
  const approvalType = approval.request.type;
  const approvalNumber = approval.number;
  const updatedCanOperate = approvalStatus === "approved";

  return {
    ...cloneDetail(detail),
    approvalRequest: approval.request,
    approvalStatus,
    approvalType,
    approvalNumber,
    hasPendingApproval: approvalStatus === "pending",
    canOperate: updatedCanOperate,
    evaluation: {
      ...detail.evaluation,
      canOperate: updatedCanOperate,
      label: updatedCanOperate ? "Puede operar" : "Requiere revisión",
      recommendation: updatedCanOperate
        ? "La cuenta puede operar con normalidad."
        : "Conviene revisar la cuenta antes de habilitar nuevas operaciones.",
    },
  };
}

function matchesSearch(detail: AccountDetailData, search: string): boolean {
  if (search.length === 0) {
    return true;
  }

  const normalized = search.toLowerCase();
  const text = [
    detail.clientCode,
    detail.clientName,
    detail.tradeName ?? "",
    detail.assignedSellerName ?? "",
    getAccountStateLabel(detail.accountStatus),
    detail.creditCondition,
    detail.approvalStatus ?? "",
    detail.movements.map((movement) => movement.documentNumber).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return text.includes(normalized);
}

function matchesFilters(detail: AccountDetailData, query: AccountListQuery): boolean {
  const { filters } = query;
  const statusMatch = filters.status === "all" || detail.accountStatus === filters.status;
  const conditionMatch = filters.creditCondition === "all" || detail.creditCondition === filters.creditCondition;
  const movementTypeMatch = filters.movementType === "all" || detail.movements.some((movement) => movement.type === filters.movementType);
  const currentDate = new Date();
  const lastMovementDate = new Date(detail.lastMovementAt);
  const dateRangeMatch =
    filters.dateRange === "all"
    || (filters.dateRange === "last30Days" && currentDate.getTime() - lastMovementDate.getTime() <= 1000 * 60 * 60 * 24 * 30)
    || (filters.dateRange === "last90Days" && currentDate.getTime() - lastMovementDate.getTime() <= 1000 * 60 * 60 * 24 * 90)
    || (filters.dateRange === "currentMonth" && lastMovementDate.getUTCMonth() === currentDate.getUTCMonth() && lastMovementDate.getUTCFullYear() === currentDate.getUTCFullYear());

  return statusMatch && conditionMatch && movementTypeMatch && dateRangeMatch && matchesSearch(detail, filters.search);
}

function updateSummary(detail: AccountDetailData, movement: AccountMovement, nextBalance: number, approvalRequest?: AuthorizationRequest, approvalNumber?: string): AccountDetailData {
  const blocked = detail.blocked;
  const nextAccountState = calculateAccountState({
    blocked,
    overdueDebt: detail.overdueDocuments.reduce((total, item) => total + item.overdueAmount, 0),
    currentBalance: nextBalance,
    creditLimit: detail.debtSnapshot.creditLimit.amount,
    underReview: detail.accountStatus === "underReview" || approvalRequest?.status === "pending" || detail.accountStatus === "creditBalance" && nextBalance < 0,
  });
  const creditCondition = calculateCreditCondition(nextAccountState, approvalRequest?.status === "pending" ? true : detail.hasPendingApproval);
  const overdueDocuments = detail.overdueDocuments.map((document) => ({ ...document }));
  const debtSnapshot = buildDebtSnapshot(detail.client, nextBalance, overdueDocuments.reduce((total, item) => total + item.overdueAmount, 0), nextAccountState === "overdue" ? Math.max(1, detail.daysPastDue + 1) : detail.daysPastDue, blocked, movement.createdAt);
  const financialSnapshot = buildFinancialSnapshot(detail.client, nextAccountState, creditCondition, nextBalance, overdueDocuments.reduce((total, item) => total + item.overdueAmount, 0), movement.createdAt);
  const creditAvailable = calculateCreditAvailable(detail.debtSnapshot.creditLimit.amount, nextBalance);
  const updated: AccountDetailData = {
    ...detail,
    accountStatus: nextAccountState,
    creditCondition,
    debtSnapshot,
    financialSnapshot,
    currentBalance: nextBalance,
    creditAvailable,
    daysPastDue: nextAccountState === "overdue" ? Math.max(detail.daysPastDue, 1) + 1 : nextAccountState === "blocked" ? Math.max(detail.daysPastDue, 30) : nextAccountState === "exceededCreditLimit" ? Math.max(detail.daysPastDue, 7) : nextAccountState === "underReview" ? Math.max(detail.daysPastDue, 5) : 0,
    movementsCount: detail.movements.length + 1,
    overdueDocumentsCount: overdueDocuments.length,
    lastMovementAt: movement.createdAt,
    lastUpdatedAt: movement.createdAt,
    needsAuthorization: nextAccountState !== "current" && nextAccountState !== "creditBalance",
    hasPendingApproval: approvalRequest?.status === "pending" ? true : detail.hasPendingApproval,
    blocked,
    canOperate: nextAccountState === "current" || nextAccountState === "creditBalance" || approvalRequest?.status === "approved" ? true : false,
    ...(approvalRequest !== undefined ? { approvalRequest, approvalStatus: approvalRequest.status, approvalType: approvalRequest.type, ...(approvalNumber !== undefined ? { approvalNumber } : {}) } : {}),
    movements: [...detail.movements, movement],
    overdueDocuments,
    evaluation: evaluateAccount(detail),
  };

  return {
    ...updated,
    evaluation: {
      ...updated.evaluation,
      canOperate: updated.canOperate,
      label: updated.canOperate ? "Puede operar" : "Requiere revisión",
      recommendation: updated.canOperate
        ? "La cuenta puede operar con normalidad."
        : "Conviene revisar la cuenta antes de habilitar nuevas operaciones.",
    },
  };
}

function createAdjustmentMovement(detail: AccountDetailData, adjustment: AccountAdjustmentInput): AccountMovement {
  const now = new Date().toISOString();
  const isDebit = adjustment.type === "debit";
  return {
    id: `adj-${detail.client.id}-${Date.now()}`,
    companyId: detail.client.companyId,
    branchId: detail.client.branchId,
    clientId: detail.client.id,
    type: "adjustment",
    documentNumber: `AJU-${new Date().getFullYear()}-${String(detail.movements.length + 1).padStart(4, "0")}`,
    description: adjustment.reference !== undefined && adjustment.reference.trim().length > 0
      ? `${adjustment.description} · Ref: ${adjustment.reference.trim()}`
      : adjustment.description,
    issueDate: now,
    debitAmount: isDebit ? adjustment.amount : 0,
    creditAmount: isDebit ? 0 : adjustment.amount,
    balanceAfter: Math.round((detail.currentBalance + (isDebit ? adjustment.amount : -adjustment.amount)) * 100) / 100,
    currency: detail.client.creditLimit.currency,
    status: "applied",
    createdAt: now,
  };
}

function hydrateRecord(record: AccountDetailData): AccountDetailData {
  return cloneDetail(record);
}

export class MockAccountRepository implements AccountRepository {
  private readonly records: AccountDetailData[];

  constructor() {
    this.records = getAccountSeedList().map((record) => hydrateRecord(record));
  }

  getReferenceData(): AccountReferenceData {
    return getAccountReferenceData();
  }

  async getAccounts(query: AccountListQuery): Promise<AccountListResult> {
    await delay();
    const filtered = this.records.filter((record) => matchesFilters(record, query));
    const start = (query.page - 1) * query.pageSize;
    const items = await Promise.all(filtered.slice(start, start + query.pageSize).map(async (record) => mergeApprovalSnapshot(record)));

    return {
      items,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getAccountByClientId(clientId: ClientId): Promise<AccountDetailData | null> {
    await delay(80);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : mergeApprovalSnapshot(record);
  }

  async getAccountMovements(clientId: ClientId): Promise<readonly AccountMovement[]> {
    await delay(60);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? [] : record.movements.map((movement) => cloneMovement(movement));
  }

  async getAccountSummary(clientId: ClientId): Promise<AccountSummary | null> {
    await delay(60);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : mergeApprovalSnapshot(record);
  }

  async getOverdueDocuments(clientId?: ClientId): Promise<readonly AccountOverdueDocument[]> {
    await delay(60);
    if (clientId !== undefined) {
      return this.records.find((item) => item.client.id === clientId)?.overdueDocuments.map((document) => cloneOverdueDocument(document)) ?? [];
    }

    return this.records.flatMap((record) => record.overdueDocuments.map((document) => cloneOverdueDocument(document)));
  }

  async evaluateClientCredit(clientId: ClientId): Promise<AccountEvaluation | null> {
    await delay(60);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : { ...record.evaluation, reasons: [...record.evaluation.reasons] };
  }

  async createMockAdjustment(clientId: ClientId, adjustment: AccountAdjustmentInput): Promise<AccountActionResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.client.id === clientId);
    if (recordIndex === -1) {
      throw new Error("Cuenta no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Cuenta no encontrada.");
    }

    if (adjustment.type !== "debit" && adjustment.type !== "credit") {
      throw new Error("El tipo de ajuste no es válido.");
    }

    if (!Number.isFinite(adjustment.amount) || adjustment.amount <= 0) {
      throw new Error("El importe del ajuste debe ser mayor que cero.");
    }

    if (adjustment.description.trim().length === 0) {
      throw new Error("El motivo del ajuste no puede estar vacío.");
    }

    const movement = createAdjustmentMovement(currentRecord, adjustment);
    const nextBalance = movement.balanceAfter;
    const updated = updateSummary(currentRecord, movement, nextBalance);
    this.records[recordIndex] = updated;

    return {
      clientId,
      movement: cloneMovement(movement),
      detail: cloneDetail(updated),
    };
  }

  async requestDebtApproval(clientId: ClientId, reason?: string): Promise<AccountApprovalResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.client.id === clientId);
    if (recordIndex === -1) {
      throw new Error("Cuenta no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Cuenta no encontrada.");
    }

    const normalizedReason = reason?.trim() ?? "";
    if (normalizedReason.length === 0) {
      throw new Error("El motivo de la autorización no puede estar vacío.");
    }

    const requestedBy = REQUESTED_BY_USERS[0] ?? asId<UserId>("user-admin-1");
    const assignedTo = REQUESTED_BY_USERS[1] ?? requestedBy;
    const approvalType: AuthorizationRequestType =
      currentRecord.accountStatus === "exceededCreditLimit"
        ? "creditLimit"
        : currentRecord.accountStatus === "overdue"
          ? "clientDebt"
          : currentRecord.accountStatus === "blocked"
            ? "blockedClient"
            : "commercialException";

    const approval = await createApprovalService({
      companyId: currentRecord.client.companyId,
      branchId: currentRecord.client.branchId,
      clientId: currentRecord.client.id,
      clientName: currentRecord.client.legalName,
      requestedBy,
      assignedTo,
      type: approvalType,
      reason: normalizedReason,
      relatedLabel: "Cuenta corriente",
      relatedRoute: `/accounts/${currentRecord.client.id}`,
      ...(currentRecord.client.assignedSellerId !== undefined ? { sellerId: currentRecord.client.assignedSellerId } : {}),
    });

    const approvalMovement: AccountMovement = {
      id: `approval-${clientId}-${Date.now()}`,
      companyId: currentRecord.client.companyId,
      branchId: currentRecord.client.branchId,
      clientId: currentRecord.client.id,
      type: "adjustment",
      documentNumber: approval.detail.number,
      description: approval.request.reason,
      issueDate: approval.request.createdAt,
      debitAmount: 0,
      creditAmount: 0,
      balanceAfter: currentRecord.currentBalance,
      currency: currentRecord.client.creditLimit.currency,
      status: "pending",
      createdAt: approval.request.createdAt,
    };

    const updated = updateSummary(currentRecord, approvalMovement, currentRecord.currentBalance, approval.request, approval.detail.number);
    this.records[recordIndex] = updated;

    return {
      clientId,
      request: approval.request,
      detail: await mergeApprovalSnapshot(updated),
    };
  }
}

export function getAccountReferenceDataService(): AccountReferenceData {
  return getAccountReferenceData();
}
