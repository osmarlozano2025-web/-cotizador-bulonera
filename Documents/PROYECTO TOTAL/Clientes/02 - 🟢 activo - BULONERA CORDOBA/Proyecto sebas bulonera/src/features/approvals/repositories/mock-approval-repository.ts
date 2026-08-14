import type { AuthorizationRequest } from "@/domain/approval/approval";
import type { AuthorizationRequestId, ClientId, OrderId, QuoteId, SellerId } from "@/domain/shared";
import { canApproveAuthorizationRequest } from "@/domain/approval/approval";
import { getApprovalReferenceData, MOCK_APPROVAL_RECORDS } from "../data/mock-approvals";
import type { ApprovalActionResult, ApprovalCreateInput, ApprovalDetailData, ApprovalListResult, ApprovalLookupResult } from "../types";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "../utils/approval-labels";
import { canCancelApprovalRequest, canRejectApprovalRequest, canResolveApprovalRequest } from "../utils/approval-rules";
import type { ApprovalListQuery, ApprovalRepository } from "./approval-repository";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function cloneRequest(request: AuthorizationRequest): AuthorizationRequest {
  return { ...request };
}

function cloneDetail(detail: ApprovalDetailData): ApprovalDetailData {
  return {
    ...detail,
    request: cloneRequest(detail.request),
    history: detail.history.map((entry) => ({ ...entry })),
    observations: [...detail.observations],
  };
}

function matchesSearch(detail: ApprovalDetailData, search: string): boolean {
  if (search.length === 0) {
    return true;
  }

  const normalized = search.toLowerCase();
  const searchText = [
    detail.number,
    detail.typeLabel,
    detail.statusLabel,
    detail.clientName,
    detail.sellerName ?? "",
    detail.requestedByName,
    detail.assignedToName ?? "",
    detail.relatedLabel ?? "",
    detail.request.reason,
  ]
    .join(" ")
    .toLowerCase();

  return searchText.includes(normalized);
}

function matchesFilters(detail: ApprovalDetailData, query: ApprovalListQuery): boolean {
  const { filters } = query;
  const statusMatch = filters.status === "all" || detail.request.status === filters.status;
  const typeMatch = filters.type === "all" || detail.request.type === filters.type;
  const currentDate = new Date();
  const createdAt = new Date(detail.request.createdAt);
  const dateRangeMatch =
    filters.dateRange === "all"
    || (filters.dateRange === "last30Days" && currentDate.getTime() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30)
    || (filters.dateRange === "currentMonth" && createdAt.getUTCMonth() === currentDate.getUTCMonth() && createdAt.getUTCFullYear() === currentDate.getUTCFullYear());

  return statusMatch && typeMatch && dateRangeMatch && matchesSearch(detail, filters.search);
}

function buildHistoryEntry(request: AuthorizationRequest, title: string, description: string): ApprovalDetailData["history"][number] {
  return {
    id: `${request.id}-${Date.now()}`,
    date: new Date().toISOString(),
    title,
    description,
    status: request.status,
  };
}

function getStatusHistoryTitle(status: AuthorizationRequest["status"]): string {
  switch (status) {
    case "pending":
      return "Estado pendiente";
    case "approved":
      return "Autorización aprobada";
    case "rejected":
      return "Autorización rechazada";
    case "cancelled":
      return "Autorización cancelada";
  }
}

function getUserLabel(userId?: string): string | undefined {
  if (userId === undefined) {
    return undefined;
  }

  const referenceData = getApprovalReferenceData();
  return referenceData.requestedByOptions.find((user) => user.id === userId)?.label
    ?? referenceData.assignedToOptions.find((user) => user.id === userId)?.label;
}

function updateRecord(record: ApprovalDetailData, nextRequest: AuthorizationRequest, description: string): ApprovalDetailData {
  return {
    ...record,
    request: nextRequest,
    statusLabel: getApprovalStatusLabel(nextRequest.status),
    canApprove: nextRequest.status === "pending",
    canReject: nextRequest.status === "pending",
    canCancel: nextRequest.status === "pending",
    history: [...record.history, buildHistoryEntry(nextRequest, getStatusHistoryTitle(nextRequest.status), description)],
    observations: record.observations,
  };
}

function buildCreatedApprovalRecord(input: ApprovalCreateInput, sequence: number): ApprovalDetailData {
  const createdAt = new Date().toISOString();
  const number = `APR-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
  const request: AuthorizationRequest = {
    id: `approval-${input.clientId}-${createdAt}` as AuthorizationRequestId,
    companyId: input.companyId,
    branchId: input.branchId,
    type: input.type,
    status: "pending",
    requestedBy: input.requestedBy,
    ...(input.sellerId !== undefined ? { sellerId: input.sellerId } : {}),
    clientId: input.clientId,
    reason: input.reason.trim(),
    createdAt,
  };

  return {
    request,
    number,
    typeLabel: getApprovalTypeLabel(input.type),
    statusLabel: getApprovalStatusLabel("pending"),
    clientName: input.clientName,
    requestedByName: getUserLabel(input.requestedBy) ?? "Sin usuario",
    assignedToName: getUserLabel(input.assignedTo) ?? "Sin asignar",
    relatedLabel: input.relatedLabel,
    relatedRoute: input.relatedRoute,
    history: [
      {
        id: `${number}-history-1`,
        date: createdAt,
        title: "Solicitud creada",
        description: "Se generó la solicitud de autorización desde cuenta corriente.",
        status: "pending",
      },
    ],
    observations: [],
    canApprove: true,
    canReject: true,
    canCancel: true,
    canComment: true,
  };
}

export class MockApprovalRepository implements ApprovalRepository {
  private readonly records: ApprovalDetailData[];

  constructor() {
    this.records = MOCK_APPROVAL_RECORDS.map((record) => cloneDetail(record));
  }

  async getApprovals(query: ApprovalListQuery): Promise<ApprovalListResult> {
    await delay();
    const filtered = this.records.filter((record) => matchesFilters(record, query));
    const start = (query.page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize).map((record) => cloneRequest(record.request));

    return {
      items,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getApprovalById(approvalId: AuthorizationRequestId): Promise<AuthorizationRequest | null> {
    await delay(60);
    const record = this.records.find((item) => item.request.id === approvalId);
    return record === undefined ? null : cloneRequest(record.request);
  }

  async getApprovalDetailData(approvalId: AuthorizationRequestId): Promise<ApprovalDetailData | null> {
    await delay(100);
    const record = this.records.find((item) => item.request.id === approvalId);
    return record === undefined ? null : cloneDetail(record);
  }

  async getApprovalLookup(approvalId: AuthorizationRequestId): Promise<ApprovalLookupResult | null> {
    await delay(60);
    const record = this.records.find((item) => item.request.id === approvalId);
    return record === undefined ? null : { request: cloneRequest(record.request), detail: cloneDetail(record) };
  }

  async getApprovalByClientId(clientId: ClientId): Promise<ApprovalDetailData | null> {
    await delay(50);
    const record = this.records.find((item) => item.request.clientId === clientId);
    return record === undefined ? null : cloneDetail(record);
  }

  async createApproval(input: ApprovalCreateInput): Promise<ApprovalActionResult> {
    await delay(80);

    if (input.reason.trim().length === 0) {
      throw new Error("El motivo de la autorización no puede estar vacío.");
    }

    const pendingRecord = this.records.find((record) => record.request.clientId === input.clientId && record.request.status === "pending");
    if (pendingRecord !== undefined) {
      throw new Error("Ya existe una autorización pendiente para esta cuenta.");
    }

    const created = buildCreatedApprovalRecord(input, this.records.length + 1);
    this.records.push(created);
    return { request: cloneRequest(created.request), detail: cloneDetail(created) };
  }

  async approveApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.request.id === approvalId);
    if (recordIndex === -1) {
      throw new Error("Autorización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Autorización no encontrada.");
    }

    if (!canResolveApprovalRequest(currentRecord.request, approverSellerId) || currentRecord.request.status !== "pending") {
      throw new Error("La autorización no puede aprobarse.");
    }

    const nextRequest: AuthorizationRequest = {
      ...currentRecord.request,
      status: "approved",
      resolvedBy: currentRecord.request.assignedTo ?? currentRecord.request.requestedBy,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: "Autorización aprobada en la simulación.",
    };
    const updated = updateRecord(currentRecord, nextRequest, "Autorización aprobada.");
    this.records[recordIndex] = updated;
    return { request: cloneRequest(updated.request), detail: cloneDetail(updated) };
  }

  async rejectApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.request.id === approvalId);
    if (recordIndex === -1) {
      throw new Error("Autorización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Autorización no encontrada.");
    }

    if (!canRejectApprovalRequest(currentRecord.request) || !canApproveAuthorizationRequest(currentRecord.request, approverSellerId)) {
      throw new Error("La autorización no puede rechazarse.");
    }

    const nextRequest: AuthorizationRequest = {
      ...currentRecord.request,
      status: "rejected",
      resolvedBy: currentRecord.request.assignedTo ?? currentRecord.request.requestedBy,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: "Autorización rechazada en la simulación.",
    };
    const updated = updateRecord(currentRecord, nextRequest, "Autorización rechazada.");
    this.records[recordIndex] = updated;
    return { request: cloneRequest(updated.request), detail: cloneDetail(updated) };
  }

  async cancelApproval(approvalId: AuthorizationRequestId): Promise<ApprovalActionResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.request.id === approvalId);
    if (recordIndex === -1) {
      throw new Error("Autorización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Autorización no encontrada.");
    }

    if (!canCancelApprovalRequest(currentRecord.request)) {
      throw new Error("La autorización no puede cancelarse.");
    }

    const nextRequest: AuthorizationRequest = {
      ...currentRecord.request,
      status: "cancelled",
      resolvedBy: currentRecord.request.assignedTo ?? currentRecord.request.requestedBy,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: "Autorización cancelada en la simulación.",
    };
    const updated = updateRecord(currentRecord, nextRequest, "Autorización cancelada.");
    this.records[recordIndex] = updated;
    return { request: cloneRequest(updated.request), detail: cloneDetail(updated) };
  }

  async addObservation(approvalId: AuthorizationRequestId, note: string): Promise<ApprovalActionResult> {
    await delay(60);
    const recordIndex = this.records.findIndex((item) => item.request.id === approvalId);
    if (recordIndex === -1) {
      throw new Error("Autorización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Autorización no encontrada.");
    }

    const normalizedNote = note.trim();
    if (normalizedNote.length === 0) {
      throw new Error("La observación no puede estar vacía.");
    }

    const updatedDetail = {
      ...currentRecord,
      observations: [...currentRecord.observations, normalizedNote],
      history: [...currentRecord.history, buildHistoryEntry(currentRecord.request, "Observación agregada", normalizedNote)],
    };
    this.records[recordIndex] = updatedDetail;
    return { request: cloneRequest(updatedDetail.request), detail: cloneDetail(updatedDetail) };
  }

  async getApprovalByQuoteId(quoteId: QuoteId): Promise<ApprovalDetailData | null> {
    await delay(40);
    const record = this.records.find((item) => item.request.quoteId === quoteId);
    return record === undefined ? null : cloneDetail(record);
  }

  async getApprovalByOrderId(orderId: OrderId): Promise<ApprovalDetailData | null> {
    await delay(40);
    const record = this.records.find((item) => item.request.orderId === orderId);
    return record === undefined ? null : cloneDetail(record);
  }

  getReferenceData() {
    return getApprovalReferenceData();
  }
}
