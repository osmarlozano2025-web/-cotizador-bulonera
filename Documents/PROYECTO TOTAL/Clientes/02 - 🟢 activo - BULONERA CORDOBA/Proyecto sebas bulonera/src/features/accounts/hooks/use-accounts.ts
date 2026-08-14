import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ClientId } from "@/domain/shared";
import { subscribeApprovalChanges } from "@/features/approvals/utils/approval-events";
import type {
  AccountActionResult,
  AccountAdjustmentInput,
  AccountApprovalResult,
  AccountDetailData,
  AccountEvaluation,
  AccountListFilters,
  AccountListResult,
  AccountReferenceData,
  AccountSummary,
} from "../types";
import { ACCOUNTS_PAGE_SIZE, DEFAULT_ACCOUNT_LIST_FILTERS } from "../types";
import { createMockAdjustment as createMockAdjustmentService, getAccountReferenceData, getAccountByClientId as getAccountByClientIdService, getAccounts as getAccountsService, requestDebtApproval as requestDebtApprovalService } from "../services/account-service";

interface UseAccountsResult {
  readonly filters: AccountListFilters;
  readonly setFilters: (next: AccountListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly result: AccountListResult | null;
  readonly previewRows: readonly AccountSummary[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly referenceData: AccountReferenceData;
}

export function useAccounts(initialFilters: Partial<AccountListFilters> = {}): UseAccountsResult {
  const [searchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<AccountListFilters>({ ...DEFAULT_ACCOUNT_LIST_FILTERS, ...initialFilters });
  const [page, setPageState] = useState(1);
  const [result, setResult] = useState<AccountListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const referenceData = useMemo(() => getAccountReferenceData(), []);
  const mockError = searchParams.get("mockError") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar las cuentas corrientes simuladas.");
      }

      const nextResult = await getAccountsService({ filters, page, pageSize: ACCOUNTS_PAGE_SIZE });
      setResult(nextResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
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

  const previewRows = useMemo<readonly AccountSummary[]>(() => result?.items ?? [], [result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_ACCOUNT_LIST_FILTERS);
    },
    page,
    setPage: setPageState,
    pageSize: ACCOUNTS_PAGE_SIZE,
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    referenceData,
  };
}

export function useAccount(clientId?: ClientId): {
  readonly detail: AccountDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly evaluation: AccountEvaluation | null;
  readonly createMockAdjustment: (adjustment: AccountAdjustmentInput) => Promise<AccountActionResult>;
  readonly requestDebtApproval: (reason?: string) => Promise<AccountApprovalResult>;
} {
  const [detail, setDetail] = useState<AccountDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (clientId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getAccountByClientIdService(clientId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

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
      if (clientId !== undefined && event.clientId === clientId) {
        void load();
      }
    });
    return unsubscribe;
  }, [clientId, load]);

  const runAction = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setActionError(null);
    try {
      return await action();
    } catch (actionFailure) {
      const nextError = actionFailure instanceof Error ? actionFailure.message : "Error inesperado.";
      setActionError(nextError);
      throw actionFailure;
    }
  }, []);

  const createMockAdjustment = useCallback((adjustment: AccountAdjustmentInput) => {
    if (clientId === undefined) {
      return Promise.reject(new Error("No se pudo identificar la cuenta."));
    }

    return runAction(async () => {
      const result = await createMockAdjustmentService(clientId, adjustment);
      setDetail(result.detail);
      return result;
    });
  }, [clientId, runAction]);

  const requestDebtApproval = useCallback((reason?: string) => {
    if (clientId === undefined) {
      return Promise.reject(new Error("No se pudo identificar la cuenta."));
    }

    return runAction(async () => {
      const result = await requestDebtApprovalService(clientId, reason);
      setDetail(result.detail);
      return result;
    });
  }, [clientId, runAction]);

  const evaluation = detail?.evaluation ?? null;

  return {
    detail,
    loading,
    error: error ?? actionError,
    refresh: load,
    evaluation,
    createMockAdjustment,
    requestDebtApproval,
  };
}
