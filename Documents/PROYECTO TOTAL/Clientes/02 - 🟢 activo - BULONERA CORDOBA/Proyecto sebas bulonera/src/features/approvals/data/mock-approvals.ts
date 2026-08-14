import type { AuthorizationRequest, AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";
import type { AuthorizationRequestId, BranchId, ClientId, CompanyId, UserId } from "@/domain/shared";
import { MOCK_ORDERS } from "@/features/orders/data/mock-orders";
import { getMockOrderDetail } from "@/features/orders/data/mock-orders";
import { MOCK_QUOTES } from "@/features/quotes/data/mock-quotes";
import { requiresQuoteAuthorization } from "@/features/quotes/utils/quote-calculations";
import type { ApprovalDetailData, ApprovalHistoryEntry, ApprovalReferenceData, ApprovalRelationSummary, ApprovalSeedLink } from "../types";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "../utils/approval-labels";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export const MOCK_APPROVAL_COMPANY_ID = asId<CompanyId>("company-cba");
export const MOCK_APPROVAL_BRANCH_ID = asId<BranchId>("branch-central");

interface ApprovalSeed {
  readonly type: AuthorizationRequestType;
  readonly status: AuthorizationRequestStatus;
  readonly requestedBy: UserId;
  readonly assignedTo?: UserId;
  readonly reason: string;
  readonly observations: readonly string[];
  readonly createdOffsetDays: number;
  readonly link: ApprovalSeedLink;
  readonly clientId?: ClientId;
}

const USER_POOL: readonly { id: UserId; label: string }[] = [
  { id: asId<UserId>("user-admin-1"), label: "Lucía Fernández" },
  { id: asId<UserId>("user-supervisor-1"), label: "Martín Gómez" },
  { id: asId<UserId>("user-seller-1"), label: "Sofía Ramírez" },
  { id: asId<UserId>("user-seller-2"), label: "Diego Torres" },
];

const REQUESTED_BY = USER_POOL.map((user) => user.id);
const ASSIGNED_TO = USER_POOL.slice(0, 2).map((user) => user.id);

const APPROVAL_SEEDS: readonly ApprovalSeed[] = [
  ...MOCK_QUOTES.slice(0, 12).map((quote, index): ApprovalSeed => ({
    type: requiresQuoteAuthorization(quote) ? "discountOverride" : "commercialException",
    status: index % 4 === 0 ? "pending" : index % 4 === 1 ? "approved" : index % 4 === 2 ? "rejected" : "cancelled",
    requestedBy: requireDefined(REQUESTED_BY[index % REQUESTED_BY.length], "No se pudo definir el usuario solicitante."),
    assignedTo: requireDefined(ASSIGNED_TO[index % ASSIGNED_TO.length], "No se pudo definir el usuario asignado."),
    reason: requiresQuoteAuthorization(quote) ? "El descuento supera el límite permitido." : "Revisión comercial general requerida.",
    observations: index % 2 === 0 ? ["Se aguardó validación del supervisor."] : ["Autorización simulada por mesa comercial."],
    createdOffsetDays: 18 - index,
    link: { quoteId: quote.id },
    clientId: quote.clientId,
  })),
  ...MOCK_ORDERS.slice(0, 12).map((order, index): ApprovalSeed => {
    const detail = getMockOrderDetail(order);
    const type: AuthorizationRequestType =
      detail.authorization.reasons.some((reason) => reason.code === "discount") ? "discountOverride"
      : detail.authorization.reasons.some((reason) => reason.code === "creditLimit") ? "creditLimit"
      : detail.authorization.reasons.some((reason) => reason.code === "debt") ? "clientDebt"
      : detail.authorization.reasons.some((reason) => reason.code === "commercial") ? "commercialException"
      : "blockedClient";
    return {
      type,
      status: index % 4 === 0 ? "pending" : index % 4 === 1 ? "approved" : index % 4 === 2 ? "rejected" : "cancelled",
      requestedBy: requireDefined(REQUESTED_BY[(index + 1) % REQUESTED_BY.length], "No se pudo definir el usuario solicitante."),
      assignedTo: requireDefined(ASSIGNED_TO[index % ASSIGNED_TO.length], "No se pudo definir el usuario asignado."),
      reason: detail.authorization.reasons[0]?.label ?? "Revisión del pedido.",
      observations: index % 2 === 0 ? ["Pedido derivado desde el circuito comercial."] : ["Autorización vinculada al pedido."],
      createdOffsetDays: 12 - index,
      link: { orderId: order.id },
      clientId: order.clientId,
    };
  }),
];

function getUserLabel(userId?: UserId): string | undefined {
  if (userId === undefined) {
    return undefined;
  }

  return USER_POOL.find((user) => user.id === userId)?.label;
}

function createHistory(number: string, status: AuthorizationRequestStatus, createdAt: string, updatedAt: string, notes: readonly string[]): readonly ApprovalHistoryEntry[] {
  const statusTitle =
    status === "pending" ? "Estado pendiente"
    : status === "approved" ? "Autorización aprobada"
    : status === "rejected" ? "Autorización rechazada"
    : "Autorización cancelada";

  const statusDescription =
    status === "pending" ? "La solicitud quedó pendiente de resolución."
    : `La solicitud quedó ${getApprovalStatusLabel(status).toLowerCase()}.`;

  return [
    { id: `${number}-history-1`, date: createdAt, title: "Solicitud creada", description: "Se generó la solicitud de autorización.", status: "pending" },
    { id: `${number}-history-2`, date: updatedAt, title: statusTitle, description: statusDescription, status },
    ...notes.map((note, index) => ({ id: `${number}-note-${index + 1}`, date: updatedAt, title: "Observación", description: note, status })),
  ];
}

function buildApprovalRecord(seed: ApprovalSeed, index: number): ApprovalDetailData {
  const now = new Date("2025-07-10T12:00:00.000Z");
  const createdAt = toIso(new Date(now.getTime() - seed.createdOffsetDays * 24 * 60 * 60 * 1000));
  const updatedAt = toIso(new Date(new Date(createdAt).getTime() + 90 * 60 * 1000));
  const number = `APR-2025-${String(index + 1).padStart(4, "0")}`;
  const request: AuthorizationRequest = {
    id: asId<AuthorizationRequestId>(`approval-${index + 1}`),
    companyId: MOCK_APPROVAL_COMPANY_ID,
    branchId: MOCK_APPROVAL_BRANCH_ID,
    type: seed.type,
    status: seed.status,
    requestedBy: seed.requestedBy,
    ...(seed.assignedTo !== undefined ? { assignedTo: seed.assignedTo } : {}),
    ...(seed.clientId !== undefined ? { clientId: seed.clientId } : {}),
    ...(seed.link.quoteId !== undefined ? { quoteId: seed.link.quoteId } : {}),
    ...(seed.link.orderId !== undefined ? { orderId: seed.link.orderId } : {}),
    reason: seed.reason,
    createdAt,
  };
  const resolvedBy = seed.assignedTo ?? seed.requestedBy;
  const requestWithResolution =
    seed.status === "approved"
      ? { resolvedBy, resolvedAt: updatedAt, resolutionNotes: "Autorización aprobada en la simulación." }
      : seed.status === "rejected"
        ? { resolvedBy, resolvedAt: updatedAt, resolutionNotes: "Autorización rechazada en la simulación." }
        : seed.status === "cancelled"
          ? { resolvedBy, resolvedAt: updatedAt, resolutionNotes: "Autorización cancelada en la simulación." }
          : {};

  const requestWithNotes = seed.observations.length > 0 ? { requestedValue: seed.observations } : {};
  const requestFinal: AuthorizationRequest = { ...request, ...requestWithResolution, ...requestWithNotes };

  const relatedLabel = seed.link.quoteId !== undefined
    ? MOCK_QUOTES.find((quote) => quote.id === seed.link.quoteId)?.number
    : seed.link.orderId !== undefined
      ? MOCK_ORDERS.find((order) => order.id === seed.link.orderId)?.number
      : undefined;
  const relatedRoute = seed.link.quoteId !== undefined
    ? `/quotes/${seed.link.quoteId}`
    : seed.link.orderId !== undefined
      ? `/orders/${seed.link.orderId}`
      : undefined;
  const clientName = seed.link.quoteId !== undefined
    ? MOCK_QUOTES.find((quote) => quote.id === seed.link.quoteId)?.clientId ?? "Cliente no encontrado"
    : seed.link.orderId !== undefined
      ? MOCK_ORDERS.find((order) => order.id === seed.link.orderId)?.clientId ?? "Cliente no encontrado"
      : "Cliente no encontrado";
  const sellerName = seed.link.quoteId !== undefined
    ? USER_POOL.find((user) => user.id === seed.requestedBy)?.label
    : USER_POOL.find((user) => user.id === seed.requestedBy)?.label;
  const assignedToName = getUserLabel(seed.assignedTo);

  const detail: ApprovalDetailData = {
    request: requestFinal,
    number,
    typeLabel: getApprovalTypeLabel(seed.type),
    statusLabel: getApprovalStatusLabel(seed.status),
    clientName,
    requestedByName: getUserLabel(seed.requestedBy) ?? "Sin usuario",
    history: createHistory(number, seed.status, createdAt, updatedAt, seed.observations),
    observations: seed.observations,
    canApprove: seed.status === "pending",
    canReject: seed.status === "pending",
    canCancel: seed.status === "pending",
    canComment: seed.status !== "cancelled",
    ...(sellerName !== undefined ? { sellerName } : {}),
    ...(assignedToName !== undefined ? { assignedToName } : {}),
    ...(relatedLabel !== undefined ? { relatedLabel } : {}),
    ...(relatedRoute !== undefined ? { relatedRoute } : {}),
  };

  return detail;
}

export const MOCK_APPROVAL_RECORDS: readonly ApprovalDetailData[] = APPROVAL_SEEDS.map((seed, index) => buildApprovalRecord(seed, index));
export const MOCK_APPROVAL_REQUESTS: readonly AuthorizationRequest[] = MOCK_APPROVAL_RECORDS.map((record) => record.request);

export function getApprovalReferenceData(): ApprovalReferenceData {
  return {
    typeOptions: [
      { id: "discountOverride", label: "Sobrescritura de descuento" },
      { id: "clientDebt", label: "Deuda de cliente" },
      { id: "creditLimit", label: "Límite de crédito" },
      { id: "manualPrice", label: "Precio manual" },
      { id: "blockedClient", label: "Cliente bloqueado" },
      { id: "commercialException", label: "Excepción comercial" },
    ],
    statusOptions: [
      { id: "pending", label: "Pendiente" },
      { id: "approved", label: "Aprobada" },
      { id: "rejected", label: "Rechazada" },
      { id: "cancelled", label: "Cancelada" },
    ],
    requestedByOptions: USER_POOL,
    assignedToOptions: USER_POOL,
  };
}

export function getApprovalSeedList(): readonly AuthorizationRequest[] {
  return MOCK_APPROVAL_REQUESTS;
}

function findDetailByRequestId(requestId: string): ApprovalDetailData | undefined {
  return MOCK_APPROVAL_RECORDS.find((record) => record.request.id === requestId);
}

export function getMockApprovalDetail(request: AuthorizationRequest): ApprovalDetailData {
  const record = findDetailByRequestId(request.id);
  if (record !== undefined) {
    return {
      ...record,
      request,
      statusLabel: getApprovalStatusLabel(request.status),
    };
  }

  const relatedLabel = request.quoteId !== undefined
    ? MOCK_QUOTES.find((quote) => quote.id === request.quoteId)?.number
    : request.orderId !== undefined
      ? MOCK_ORDERS.find((order) => order.id === request.orderId)?.number
      : undefined;
  const relatedRoute = request.quoteId !== undefined
    ? `/quotes/${request.quoteId}`
    : request.orderId !== undefined
      ? `/orders/${request.orderId}`
      : undefined;

  const detail: ApprovalDetailData = {
    request,
    number: "APR-YYYY-0000",
    typeLabel: getApprovalTypeLabel(request.type),
    statusLabel: getApprovalStatusLabel(request.status),
    clientName: "Cliente no encontrado",
    requestedByName: getUserLabel(request.requestedBy) ?? "Sin usuario",
    history: createHistory("APR-YYYY-0000", request.status, request.createdAt, request.createdAt, []),
    observations: [],
    canApprove: request.status === "pending",
    canReject: request.status === "pending",
    canCancel: request.status === "pending",
    canComment: request.status !== "cancelled",
    ...(getUserLabel(request.assignedTo) !== undefined ? { assignedToName: getUserLabel(request.assignedTo) as string } : {}),
    ...(relatedLabel !== undefined ? { relatedLabel } : {}),
    ...(relatedRoute !== undefined ? { relatedRoute } : {}),
  };

  return detail;
}

export function getApprovalRelationSummary(request: AuthorizationRequest): ApprovalRelationSummary | null {
  const detail = getMockApprovalDetail(request);
  if (detail.relatedRoute === undefined) {
    return null;
  }

  return {
    id: detail.request.id,
    number: detail.number,
    status: detail.request.status,
    statusLabel: detail.statusLabel,
    typeLabel: detail.typeLabel,
    route: detail.relatedRoute,
  };
}
