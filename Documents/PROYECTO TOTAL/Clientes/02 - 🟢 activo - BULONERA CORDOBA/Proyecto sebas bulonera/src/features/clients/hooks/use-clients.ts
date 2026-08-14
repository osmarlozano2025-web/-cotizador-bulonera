import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientStatus } from "@/domain/client/types";
import type { ClientId } from "@/domain/shared";
import { DEFAULT_CLIENT_LIST_FILTERS, DEFAULT_CLIENT_LIST_SORT, CLIENTS_PAGE_SIZE, type ClientAccountSummary, type ClientCapabilities, type ClientDetailData, type ClientListFilters, type ClientListResult, type ClientListSort, type ClientPreviewRow } from "../types";
import { changeClientStatus, getClientDetailData, getClients } from "../services/client-service";
import { getClientCapabilities } from "../utils/client-access";
import { useSearchParams } from "react-router-dom";
import { ROLES } from "@/features/auth";
import { getClientReferenceData } from "../services/client-service";

interface UseClientsResult {
  readonly filters: ClientListFilters;
  readonly setFilters: (next: ClientListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly sort: ClientListSort;
  readonly setSort: (next: ClientListSort) => void;
  readonly result: ClientListResult | null;
  readonly previewRows: readonly ClientPreviewRow[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ClientCapabilities;
}

export function useClients(initialFilters: Partial<ClientListFilters> = {}): UseClientsResult {
  const [searchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<ClientListFilters>({ ...DEFAULT_CLIENT_LIST_FILTERS, ...initialFilters });
  const [page, setPageState] = useState(1);
  const [sort, setSortState] = useState<ClientListSort>(DEFAULT_CLIENT_LIST_SORT);
  const [result, setResult] = useState<ClientListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const capabilities = useMemo(() => getClientCapabilities(ROLES.ADMIN), []);
  const references = useMemo(() => getClientReferenceData(), []);
  const mockError = searchParams.get("mockError") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar los clientes simulados.");
      }

      const nextResult = await getClients({ filters, page, pageSize: CLIENTS_PAGE_SIZE, sort });
      setResult(nextResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [filters, mockError, page, sort]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  const previewRows = useMemo<readonly ClientPreviewRow[]>(() => {
    const rows = result?.items ?? [];
    return rows.map((client) => {
      const sellerName = references.sellerOptions.find((seller) => seller.id === client.assignedSellerId)?.label ?? "Sin asignar";
      const priceListName = references.priceListOptions.find((priceList) => priceList.id === client.priceListId)?.label ?? "Sin lista";
      const accountSummary: ClientAccountSummary = {
        clientId: client.id,
        debtTotal: client.currentDebt.amount,
        overdueDebt: client.overdueDebt.amount,
        creditLimit: client.creditLimit.amount,
        creditAvailable: Math.max(0, client.creditLimit.amount - client.currentDebt.amount),
        daysPastDue: client.accountStatus === "current" ? 0 : 10,
        accountStatus: client.accountStatus,
        needsAuthorization: client.accountStatus !== "current",
        ordersCount: 0,
        lastUpdatedAt: client.updatedAt,
      };

      return { client, sellerName, priceListName, accountSummary };
    });
  }, [references.priceListOptions, references.sellerOptions, result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_CLIENT_LIST_FILTERS);
    },
    page,
    setPage: setPageState,
    pageSize: CLIENTS_PAGE_SIZE,
    sort,
    setSort: (nextSort) => {
      setPageState(1);
      setSortState(nextSort);
    },
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    capabilities,
  };
}

export function useClientDetail(clientId?: ClientId): {
  readonly detail: ClientDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ClientCapabilities;
} {
  const [detail, setDetail] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getClientCapabilities(ROLES.ADMIN), []);

  const load = useCallback(async () => {
    if (clientId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getClientDetailData(clientId);
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

  return {
    detail,
    loading,
    error,
    refresh: load,
    capabilities,
  };
}

export async function mutateClientStatus(clientId: ClientId, status: ClientStatus): Promise<void> {
  await changeClientStatus(clientId, status);
}
