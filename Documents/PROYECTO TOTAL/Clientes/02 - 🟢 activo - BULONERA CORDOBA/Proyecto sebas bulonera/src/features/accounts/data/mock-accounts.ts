import type { AuthorizationRequest, AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";
import type { Client } from "@/domain/client/client";
import type { ClientId, UserId, AuthorizationRequestId, OrderId } from "@/domain/shared";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import type { AccountDetailData, AccountMovement, AccountOverdueDocument, AccountReferenceData, AccountState } from "../types";
import { buildDebtSnapshot, buildFinancialSnapshot, calculateAccountState, calculateCreditAvailable, calculateCreditCondition } from "../utils/account-calculations";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();

const NOW = new Date("2025-07-10T12:00:00.000Z");
const REQUESTED_BY_USERS: readonly UserId[] = [
  asId<UserId>("user-admin-1"),
  asId<UserId>("user-supervisor-1"),
  asId<UserId>("user-seller-1"),
  asId<UserId>("user-seller-2"),
];
const ASSIGNED_TO_USERS: readonly UserId[] = [
  asId<UserId>("user-admin-1"),
  asId<UserId>("user-supervisor-1"),
];

type MovementSeed = {
  readonly id: string;
  readonly type: AccountMovement["type"];
  readonly documentNumber: string;
  readonly description: string;
  readonly issueDate: string;
  readonly dueDate?: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly status: AccountMovement["status"];
  readonly relatedInvoiceId?: string;
  readonly relatedOrderId?: OrderId;
};

interface AccountSeed {
  readonly client: Client;
  readonly accountState: AccountState;
  readonly currentBalance: number;
  readonly overdueDebt: number;
  readonly creditCondition: ReturnType<typeof calculateCreditCondition>;
  readonly daysPastDue: number;
  readonly approvalStatus?: AuthorizationRequestStatus;
  readonly approvalType?: AuthorizationRequestType;
  readonly approvalReason?: string;
}

function getSellerName(client: Client): string | undefined {
  return MOCK_SELLERS.find((seller) => seller.id === client.assignedSellerId)?.label;
}

function createAuthorizationRequest(seed: AccountSeed, approvedAt: string): AuthorizationRequest | undefined {
  if (seed.approvalStatus === undefined || seed.approvalType === undefined || seed.approvalReason === undefined) {
    return undefined;
  }

  return {
    id: asId<AuthorizationRequestId>(`approval-${seed.client.id}`),
    companyId: seed.client.companyId,
    branchId: seed.client.branchId,
    type: seed.approvalType,
    status: seed.approvalStatus,
    requestedBy: REQUESTED_BY_USERS[0] ?? asId<UserId>("user-admin-1"),
    ...(seed.client.assignedSellerId !== undefined ? { sellerId: seed.client.assignedSellerId } : {}),
    clientId: seed.client.id,
    reason: seed.approvalReason,
    createdAt: approvedAt,
    ...(seed.approvalStatus === "approved"
      ? {
          resolvedBy: ASSIGNED_TO_USERS[0] ?? REQUESTED_BY_USERS[0] ?? asId<UserId>("user-admin-1"),
          resolvedAt: approvedAt,
          resolutionNotes: "Autorización aprobada en la simulación.",
        }
      : {}),
  };
}

function buildMovement(
  client: Client,
  seed: MovementSeed,
): AccountMovement {
  return {
    id: seed.id,
    companyId: client.companyId,
    branchId: client.branchId,
    clientId: client.id,
    type: seed.type,
    documentNumber: seed.documentNumber,
    description: seed.description,
    issueDate: seed.issueDate,
    ...(seed.dueDate !== undefined ? { dueDate: seed.dueDate } : {}),
    debitAmount: seed.debitAmount,
    creditAmount: seed.creditAmount,
    balanceAfter: Math.round((seed.debitAmount - seed.creditAmount) * 100) / 100,
    currency: client.creditLimit.currency,
    status: seed.status,
    ...(seed.relatedOrderId !== undefined ? { relatedOrderId: seed.relatedOrderId } : {}),
    ...(seed.relatedInvoiceId !== undefined ? { relatedInvoiceId: seed.relatedInvoiceId } : {}),
    createdAt: seed.issueDate,
  };
}

function buildMovementSeries(client: Client, index: number, targetBalance: number, accountState: AccountState): readonly AccountMovement[] {
  const invoiceId = `mov-${client.id}-invoice`;
  const paymentId = `mov-${client.id}-payment`;
  const creditNoteId = `mov-${client.id}-credit-note`;
  const debitNoteId = `mov-${client.id}-debit-note`;
  const adjustmentId = `mov-${client.id}-adjustment`;

  const overdueProfile = accountState === "overdue" || accountState === "blocked" || accountState === "exceededCreditLimit";
  const openingDate = new Date(NOW.getTime() - (overdueProfile ? 52 : 18) * 24 * 60 * 60 * 1000);
  const invoiceIssueDate = toIso(openingDate);
  const invoiceDueDate = toIso(new Date(openingDate.getTime() + (overdueProfile ? 18 : 30) * 24 * 60 * 60 * 1000));
  const paymentDate = toIso(new Date(openingDate.getTime() + 8 * 24 * 60 * 60 * 1000));
  const creditNoteDate = toIso(new Date(openingDate.getTime() + 11 * 24 * 60 * 60 * 1000));
  const debitNoteDate = toIso(new Date(openingDate.getTime() + 14 * 24 * 60 * 60 * 1000));
  const adjustmentDate = toIso(new Date(openingDate.getTime() + 17 * 24 * 60 * 60 * 1000));

  const baseInvoice = Math.max(25000, Math.round(Math.abs(targetBalance) * 0.72) + 18000 + index * 1100);
  const payment = Math.max(0, Math.round(baseInvoice * (accountState === "current" || accountState === "creditBalance" ? 0.48 : 0.22)));
  const creditNote = index % 2 === 0 ? Math.max(0, Math.round(baseInvoice * 0.07)) : 0;
  const debitNote = index % 3 === 0 ? Math.max(0, Math.round(baseInvoice * 0.05)) : 0;

  const seeds: MovementSeed[] = [
    {
      id: invoiceId,
      type: "invoice",
      documentNumber: `FAC-${String(index + 1).padStart(4, "0")}`,
      description: `Factura simulada de ${client.legalName}.`,
      issueDate: invoiceIssueDate,
      dueDate: invoiceDueDate,
      debitAmount: baseInvoice,
      creditAmount: 0,
      status: overdueProfile && targetBalance > 0 ? "overdue" : payment > 0 ? "partiallyPaid" : "pending",
    },
    {
      id: paymentId,
      type: "payment",
      documentNumber: `REC-${String(index + 1).padStart(4, "0")}`,
      description: "Pago parcial simulado.",
      issueDate: paymentDate,
      debitAmount: 0,
      creditAmount: payment,
      status: payment >= baseInvoice ? "paid" : payment > 0 ? "partiallyPaid" : "applied",
      relatedInvoiceId: invoiceId,
    },
    {
      id: creditNoteId,
      type: "creditNote",
      documentNumber: `NCR-${String(index + 1).padStart(4, "0")}`,
      description: "Nota de crédito por bonificación comercial.",
      issueDate: creditNoteDate,
      debitAmount: 0,
      creditAmount: creditNote,
      status: "applied",
      relatedInvoiceId: invoiceId,
    },
    {
      id: debitNoteId,
      type: "debitNote",
      documentNumber: `NDB-${String(index + 1).padStart(4, "0")}`,
      description: "Nota de débito por ajuste de cartera.",
      issueDate: debitNoteDate,
      dueDate: toIso(new Date(new Date(debitNoteDate).getTime() + 12 * 24 * 60 * 60 * 1000)),
      debitAmount: debitNote,
      creditAmount: 0,
      status: overdueProfile && debitNote > 0 ? "overdue" : debitNote > 0 ? "pending" : "applied",
      relatedInvoiceId: invoiceId,
    },
  ];

  const runningBeforeAdjustment = seeds.reduce((total, item) => total + item.debitAmount - item.creditAmount, 0);
  const adjustment = Math.round((targetBalance - runningBeforeAdjustment) * 100) / 100;
  if (adjustment !== 0) {
    seeds.push({
      id: adjustmentId,
      type: "adjustment",
      documentNumber: `AJU-${String(index + 1).padStart(4, "0")}`,
      description: adjustment > 0 ? "Ajuste de débito simulado." : "Ajuste de crédito simulado.",
      issueDate: adjustmentDate,
      debitAmount: adjustment > 0 ? adjustment : 0,
      creditAmount: adjustment < 0 ? Math.abs(adjustment) : 0,
      status: "applied",
      relatedInvoiceId: invoiceId,
    });
  }

  const movements: AccountMovement[] = [];
  let runningBalance = 0;
  for (const seed of seeds) {
    const movement = buildMovement(client, seed);
    runningBalance = Math.round((runningBalance + movement.debitAmount - movement.creditAmount) * 100) / 100;
    movements.push({
      ...movement,
      balanceAfter: runningBalance,
    });
  }

  return movements;
}

function buildOverdueDocuments(movements: readonly AccountMovement[]): readonly AccountOverdueDocument[] {
  return movements
    .filter((movement) => movement.dueDate !== undefined && movement.balanceAfter > 0 && (movement.status === "overdue" || new Date(movement.dueDate).getTime() < NOW.getTime()))
    .map((movement, index) => {
      const dueDate = movement.dueDate ?? movement.issueDate;
      const daysPastDue = Math.max(1, Math.ceil((NOW.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: `${movement.id}-overdue-${index + 1}`,
        clientId: movement.clientId,
        documentNumber: movement.documentNumber,
        description: movement.description,
        dueDate,
        amount: movement.debitAmount,
        overdueAmount: movement.balanceAfter,
        daysPastDue,
        currency: movement.currency,
        status: "overdue",
        relatedMovementId: movement.id,
        ...(movement.relatedOrderId !== undefined ? { relatedOrderId: movement.relatedOrderId } : {}),
        ...(movement.relatedInvoiceId !== undefined ? { relatedInvoiceId: movement.relatedInvoiceId } : {}),
      };
    });
}

function buildAccountSeed(client: Client, index: number): AccountSeed {
  const baseBalance = client.currentDebt.amount;
  const targetBalance = client.id === "client-centro-industrial" || client.id === "client-rio-seco" || client.id === "client-los-pinos"
    ? -Math.max(5000, 12000 + index * 2500)
    : baseBalance;
  const blocked = client.status === "blocked" || client.commercialStatus === "blocked";
  const overdueDebt = client.overdueDebt.amount;
  const underReview = client.commercialStatus === "underReview" || client.status === "pendingApproval";
  const accountState = calculateAccountState({
    blocked,
    overdueDebt,
    currentBalance: targetBalance,
    creditLimit: client.creditLimit.amount,
    underReview,
  });
  const pendingApproval = client.status === "pendingApproval";
  const creditCondition = calculateCreditCondition(accountState, pendingApproval);
  const daysPastDue =
    accountState === "overdue"
      ? 12 + index
      : accountState === "exceededCreditLimit"
        ? 7 + index
        : accountState === "blocked"
          ? 30 + index
          : accountState === "underReview"
            ? 9 + index
            : 0;

  const approvalStatus =
    client.id === "client-sur-construccion"
      ? "pending"
      : client.id === "client-este-ferreteria"
        ? "pending"
        : client.id === "client-nuevo-horizonte"
          ? "approved"
          : undefined;

  const approvalType =
    accountState === "exceededCreditLimit"
      ? "creditLimit"
      : accountState === "overdue"
        ? "clientDebt"
        : accountState === "blocked"
          ? "blockedClient"
          : accountState === "underReview"
            ? "commercialException"
            : undefined;

  const approvalReason =
    approvalType === "creditLimit"
      ? "La cuenta superó el límite de crédito."
      : approvalType === "clientDebt"
        ? "Existe deuda vencida pendiente de gestión."
        : approvalType === "blockedClient"
          ? "El cliente quedó bloqueado comercialmente."
          : approvalType === "commercialException"
            ? "La cuenta requiere revisión comercial."
            : undefined;

  return {
    client,
    accountState,
    currentBalance: targetBalance,
    overdueDebt,
    creditCondition,
    daysPastDue,
    ...(approvalStatus !== undefined ? { approvalStatus } : {}),
    ...(approvalType !== undefined ? { approvalType } : {}),
    ...(approvalReason !== undefined ? { approvalReason } : {}),
  };
}

function buildAccountDetail(seed: AccountSeed, index: number): AccountDetailData {
  const movements = buildMovementSeries(seed.client, index, seed.currentBalance, seed.accountState);
  const overdueDocuments = buildOverdueDocuments(movements);
  const lastMovement = movements[movements.length - 1];
  const lastMovementAt = lastMovement?.createdAt ?? seed.client.updatedAt;
  const debtSnapshot = buildDebtSnapshot(seed.client, seed.currentBalance, seed.overdueDebt, seed.daysPastDue, seed.accountState === "blocked", seed.client.updatedAt);
  const financialSnapshot = buildFinancialSnapshot(seed.client, seed.accountState, seed.creditCondition, seed.currentBalance, seed.overdueDebt, seed.client.updatedAt);
  const creditAvailable = calculateCreditAvailable(seed.client.creditLimit.amount, seed.currentBalance);
  const approvalRequest = seed.approvalStatus !== undefined && seed.approvalType !== undefined && seed.approvalReason !== undefined
    ? createAuthorizationRequest(seed, toIso(new Date(seed.client.updatedAt)))
    : undefined;
  const hasPendingApproval = approvalRequest?.status === "pending" ? true : false;
  const canOperate = seed.accountState === "current" || seed.accountState === "creditBalance" || approvalRequest?.status === "approved";

  const summary: AccountDetailData = {
    clientId: seed.client.id,
    clientCode: seed.client.code,
    clientName: seed.client.legalName,
    ...(seed.client.tradeName !== undefined ? { tradeName: seed.client.tradeName } : {}),
    ...(getSellerName(seed.client) !== undefined ? { assignedSellerName: getSellerName(seed.client) as string } : {}),
    creditCondition: seed.creditCondition,
    accountStatus: seed.accountState,
    debtSnapshot,
    financialSnapshot,
    currentBalance: seed.currentBalance,
    creditAvailable,
    daysPastDue: seed.daysPastDue,
    movementsCount: movements.length,
    overdueDocumentsCount: overdueDocuments.length,
    lastMovementAt,
    lastUpdatedAt: seed.client.updatedAt,
    needsAuthorization: seed.accountState !== "current" && seed.accountState !== "creditBalance",
    hasPendingApproval,
    blocked: seed.accountState === "blocked",
    canOperate,
    ...(approvalRequest !== undefined ? { approvalRequest, approvalStatus: approvalRequest.status, approvalType: approvalRequest.type } : {}),
    client: seed.client,
    movements,
    overdueDocuments,
    evaluation: {
      canOperate,
      label: canOperate ? "Puede operar" : "Requiere revisión",
      recommendation: canOperate
        ? "La cuenta puede operar con normalidad."
        : "Conviene revisar la cuenta antes de habilitar nuevas operaciones.",
      reasons: seed.accountState === "current"
        ? ["No presenta alertas relevantes."]
        : seed.accountState === "creditBalance"
          ? ["La cuenta conserva saldo a favor."]
          : seed.accountState === "underReview"
            ? ["La cuenta requiere validación comercial."]
            : seed.accountState === "blocked"
              ? ["La cuenta está bloqueada."]
              : seed.accountState === "overdue"
                ? ["La cuenta posee deuda vencida."]
                : ["Se superó el límite de crédito."],
      riskLevel: seed.accountState === "current" || seed.accountState === "creditBalance"
        ? "low"
        : seed.accountState === "underReview"
          ? "medium"
          : "high",
    },
  };

  return summary;
}

const ACCOUNT_SEEDS: readonly AccountSeed[] = MOCK_CLIENTS.map((client, index) => buildAccountSeed(client, index));
const ACCOUNT_RECORDS: readonly AccountDetailData[] = ACCOUNT_SEEDS.map((seed, index) => buildAccountDetail(seed, index));

export function getAccountReferenceData(): AccountReferenceData {
  return {
    statusOptions: [
      { id: "all", label: "Todos" },
      { id: "current", label: "Al día" },
      { id: "overdue", label: "Vencida" },
      { id: "exceededCreditLimit", label: "Límite excedido" },
      { id: "blocked", label: "Bloqueada" },
      { id: "underReview", label: "En revisión" },
      { id: "creditBalance", label: "Saldo a favor" },
    ],
    creditConditionOptions: [
      { id: "all", label: "Todas" },
      { id: "normal", label: "Normal" },
      { id: "review", label: "En revisión" },
      { id: "restricted", label: "Restringida" },
      { id: "blocked", label: "Bloqueada" },
    ],
    movementTypeOptions: [
      { id: "all", label: "Todos" },
      { id: "invoice", label: "Factura" },
      { id: "payment", label: "Pago" },
      { id: "creditNote", label: "Nota de crédito" },
      { id: "debitNote", label: "Nota de débito" },
      { id: "adjustment", label: "Ajuste" },
    ],
    movementStatusOptions: [
      { id: "pending", label: "Pendiente" },
      { id: "partiallyPaid", label: "Parcialmente pagado" },
      { id: "paid", label: "Pagado" },
      { id: "overdue", label: "Vencido" },
      { id: "cancelled", label: "Cancelado" },
      { id: "applied", label: "Aplicado" },
    ],
  };
}

export function getAccountSeedList(): readonly AccountDetailData[] {
  return ACCOUNT_RECORDS;
}

export function getMockAccountDetail(clientId: ClientId): AccountDetailData | null {
  return ACCOUNT_RECORDS.find((record) => record.client.id === clientId) ?? null;
}

export function getMockAccountSummary(clientId: ClientId): AccountDetailData | null {
  return getMockAccountDetail(clientId);
}

export function getMockAccountMovements(clientId: ClientId): readonly AccountMovement[] {
  return getMockAccountDetail(clientId)?.movements ?? [];
}

export function getMockOverdueDocuments(clientId?: ClientId): readonly AccountOverdueDocument[] {
  if (clientId === undefined) {
    return ACCOUNT_RECORDS.flatMap((record) => record.overdueDocuments);
  }

  return getMockAccountDetail(clientId)?.overdueDocuments ?? [];
}

export function getAccountRecordByClientId(clientId: ClientId): AccountDetailData | null {
  return ACCOUNT_RECORDS.find((record) => record.client.id === clientId) ?? null;
}
