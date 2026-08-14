import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ROLES, type Role } from "@/features/auth";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { AuthorizationRequest } from "@/domain/approval/approval";
import type { AuthorizationRequestId, OrderId, QuoteId } from "@/domain/shared";
import type {
  ApprovalCapabilities,
  ApprovalDetailData,
  ApprovalListFilters,
  ApprovalListResult,
  ApprovalPreviewRow,
  ApprovalReferenceData,
} from "../types";
import { APPROVALS_PAGE_SIZE, DEFAULT_APPROVAL_LIST_FILTERS } from "../types";
import { getApprovalCapabilities } from "../utils/approval-access";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "../utils/approval-labels";
import { subscribeApprovalChanges } from "../utils/approval-events";
import { addApprovalObservation, approveApproval as approveApprovalService, cancelApproval as cancelApprovalService, getApprovalByOrderId as getApprovalByOrderIdService, getApprovalByQuoteId as getApprovalByQuoteIdService, getApprovalDetailData as getApprovalDetailDataService, getApprovalReferenceDataService, getApprovals as getApprovalsService, rejectApproval as rejectApprovalService } from "../services/approval-service";

const APPROVAL_SEARCH_KEYS = {
  search: "search",
  status: "status",
  type: "type",
  dateRange: "dateRange",
  page: "page",
  mockError: "mockError",
} as const;

function getFilterValue<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  if (value === null) {
    return fallback;
  }

  return options.includes(value as T) ? (value as T) : fallback;
}

function readInitialApprovalState(searchParams: URLSearchParams): { readonly filters: ApprovalListFilters; readonly page: number } {
  const filters: ApprovalListFilters = {
    search: searchParams.get(APPROVAL_SEARCH_KEYS.search) ?? DEFAULT_APPROVAL_LIST_FILTERS.search,
    status: getFilterValue(searchParams.get(APPROVAL_SEARCH_KEYS.status), ["all", "pending", "approved", "rejected", "cancelled"], DEFAULT_APPROVAL_LIST_FILTERS.status),
    type: getFilterValue(searchParams.get(APPROVAL_SEARCH_KEYS.type), ["all", "discountOverride", "clientDebt", "creditLimit", "manualPrice", "blockedClient", "commercialException"], DEFAULT_APPROVAL_LIST_FILTERS.type),
    dateRange: getFilterValue(searchParams.get(APPROVAL_SEARCH_KEYS.dateRange), ["all", "currentMonth", "last30Days"], DEFAULT_APPROVAL_LIST_FILTERS.dateRange),
  };
  const parsedPage = Number(searchParams.get(APPROVAL_SEARCH_KEYS.page) ?? "1");

  return {
    filters,
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? Math.trunc(parsedPage) : 1,
  };
}

function buildApprovalSearchParams(filters: ApprovalListFilters, page: number, mockError: boolean): URLSearchParams {
  const nextSearchParams = new URLSearchParams();
  if (filters.search.length > 0) {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.search, filters.search);
  }
  if (filters.status !== "all") {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.status, filters.status);
  }
  if (filters.type !== "all") {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.type, filters.type);
  }
  if (filters.dateRange !== "all") {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.dateRange, filters.dateRange);
  }
  if (page > 1) {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.page, String(page));
  }
  if (mockError) {
    nextSearchParams.set(APPROVAL_SEARCH_KEYS.mockError, "1");
  }
  return nextSearchParams;
}

interface UseApprovalsResult {
  readonly filters: ApprovalListFilters;
  readonly setFilters: (next: ApprovalListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly result: ApprovalListResult | null;
  readonly previewRows: readonly ApprovalPreviewRow[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ApprovalCapabilities;
  readonly referenceData: ApprovalReferenceData;
}

export function useApprovals(initialFilters: Partial<ApprovalListFilters> = {}, role: Role = ROLES.ADMIN): UseApprovalsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialState = useMemo(() => readInitialApprovalState(searchParams), [searchParams]);
  const [filters, setFiltersState] = useState<ApprovalListFilters>({ ...initialState.filters, ...initialFilters });
  const [page, setPageState] = useState(initialState.page);
  const [result, setResult] = useState<ApprovalListResult | null>(null);
  const [previewDetails, setPreviewDetails] = useState<Record<string, ApprovalDetailData | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getApprovalCapabilities(role), [role]);
  const referenceData = useMemo(() => getApprovalReferenceDataService(), []);
  const mockError = searchParams.get(APPROVAL_SEARCH_KEYS.mockError) === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar las autorizaciones simuladas.");
      }

      const nextResult = await getApprovalsService({ filters, page, pageSize: APPROVALS_PAGE_SIZE });
      setResult(nextResult);
      const nextDetails = await Promise.all(
        nextResult.items.map(async (request) => [request.id, await getApprovalDetailDataService(request.id)] as const),
      );
      setPreviewDetails(Object.fromEntries(nextDetails));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
      setPreviewDetails({});
    } finally {
      setLoading(false);
    }
  }, [filters, mockError, page]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeApprovalChanges(() => {
      void load();
    });
    return unsubscribe;
  }, [load]);

  const previewRows = useMemo<readonly ApprovalPreviewRow[]>(() => {
    const rows = result?.items ?? [];
    return rows.map((request) => {
      const detail = previewDetails[request.id];
      const clientName = detail?.clientName ?? "Cliente vinculado";
      const sellerName = detail?.sellerName ?? "Sin vendedor";
      const requestedByName = detail?.requestedByName ?? referenceData.requestedByOptions.find((option) => option.id === request.requestedBy)?.label ?? "Sin usuario";
      const assignedToName = detail?.assignedToName ?? referenceData.assignedToOptions.find((option) => option.id === request.assignedTo)?.label ?? "Sin asignar";
      const relatedLabel = detail?.relatedLabel ?? "Manual";
      const searchText = [request.id, request.type, request.status, requestedByName, assignedToName, relatedLabel].join(" ").toLowerCase();

      return {
        request,
        number: `APR-2025-${request.id.slice(-4).padStart(4, "0")}`,
        typeLabel: getApprovalTypeLabel(request.type),
        statusLabel: getApprovalStatusLabel(request.status),
        clientName,
        sellerName,
        requestedByName,
        assignedToName,
        relatedLabel,
        searchText,
      };
    });
  }, [previewDetails, referenceData.assignedToOptions, referenceData.requestedByOptions, result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
      setSearchParams(buildApprovalSearchParams(next, 1, mockError), { replace: true });
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_APPROVAL_LIST_FILTERS);
      setSearchParams(buildApprovalSearchParams(DEFAULT_APPROVAL_LIST_FILTERS, 1, mockError), { replace: true });
    },
    page,
    setPage: (nextPage) => {
      setPageState(nextPage);
      setSearchParams(buildApprovalSearchParams(filters, nextPage, mockError), { replace: true });
    },
    pageSize: APPROVALS_PAGE_SIZE,
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    capabilities,
    referenceData,
  };
}

export function useApproval(approvalId?: AuthorizationRequestId, role: Role = ROLES.ADMIN): {
  readonly detail: ApprovalDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ApprovalCapabilities;
} {
  const [detail, setDetail] = useState<ApprovalDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getApprovalCapabilities(role), [role]);

  const load = useCallback(async () => {
    if (approvalId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getApprovalDetailDataService(approvalId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeApprovalChanges((event) => {
      if (approvalId !== undefined && event.approvalId === approvalId) {
        void load();
      }
    });
    return unsubscribe;
  }, [approvalId, load]);

  return {
    detail,
    loading,
    error,
    refresh: load,
    capabilities,
  };
}

export function useApprovalByQuoteId(quoteId?: QuoteId): {
  readonly detail: ApprovalDetailData | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<void>;
} {
  const [detail, setDetail] = useState<ApprovalDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (quoteId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDetail(await getApprovalByQuoteIdService(quoteId));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeApprovalChanges((event) => {
      if (quoteId !== undefined && event.quoteId === quoteId) {
        void load();
      }
    });
    return unsubscribe;
  }, [load, quoteId]);

  return { detail, loading, refresh: load };
}

export function useApprovalByOrderId(orderId?: OrderId): {
  readonly detail: ApprovalDetailData | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<void>;
} {
  const [detail, setDetail] = useState<ApprovalDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (orderId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDetail(await getApprovalByOrderIdService(orderId));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeApprovalChanges((event) => {
      if (orderId !== undefined && event.orderId === orderId) {
        void load();
      }
    });
    return unsubscribe;
  }, [load, orderId]);

  return { detail, loading, refresh: load };
}

export function useApprovalActions(): {
  readonly approveApproval: (approvalId: AuthorizationRequestId) => Promise<AuthorizationRequest>;
  readonly rejectApproval: (approvalId: AuthorizationRequestId) => Promise<AuthorizationRequest>;
  readonly cancelApproval: (approvalId: AuthorizationRequestId) => Promise<AuthorizationRequest>;
  readonly addObservation: (approvalId: AuthorizationRequestId, note: string) => Promise<AuthorizationRequest>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction((action: () => Promise<AuthorizationRequest>) => action());

  const approveApproval = useCallback((approvalId: AuthorizationRequestId) => run(async () => (await approveApprovalService(approvalId)).request), [run]);
  const rejectApproval = useCallback((approvalId: AuthorizationRequestId) => run(async () => (await rejectApprovalService(approvalId)).request), [run]);
  const cancelApproval = useCallback((approvalId: AuthorizationRequestId) => run(async () => (await cancelApprovalService(approvalId)).request), [run]);
  const addObservationAction = useCallback((approvalId: AuthorizationRequestId, note: string) => run(async () => (await addApprovalObservation(approvalId, note)).request), [run]);

  return { approveApproval, rejectApproval, cancelApproval, addObservation: addObservationAction, loading, error };
}
