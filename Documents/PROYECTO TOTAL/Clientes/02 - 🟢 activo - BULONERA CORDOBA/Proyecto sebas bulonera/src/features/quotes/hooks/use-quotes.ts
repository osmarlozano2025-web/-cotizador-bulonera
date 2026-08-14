import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ROLES, type Role } from "@/features/auth";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import type { Quote } from "@/domain/quote/quote";
import type { QuoteId, SellerId } from "@/domain/shared";
import { DEFAULT_QUOTE_LIST_FILTERS, QUOTES_PAGE_SIZE, type QuoteCapabilities, type QuoteDetailData, type QuoteListFilters, type QuoteListResult, type QuotePreviewRow, type QuoteReferenceData } from "../types";
import { getQuoteCapabilities } from "../utils/quote-access";
import { getQuoteDueLabel, isQuoteConvertible } from "../utils/quote-calculations";
import { getQuoteStatusLabel } from "../utils/quote-labels";
import { convertQuote as convertQuoteService, duplicateQuote as duplicateQuoteService, getQuoteDetailData as getQuoteDetailDataService, getQuoteReferenceDataService, getQuotes as getQuotesService, submitQuoteForm } from "../services/quote-service";
import { getApprovalByQuoteId as getApprovalByQuoteIdService } from "@/features/approvals/services/approval-service";
import { subscribeApprovalChanges } from "@/features/approvals/utils/approval-events";
import type { QuoteConversionPreview, QuoteFormValues } from "../types";

interface UseQuotesResult {
  readonly filters: QuoteListFilters;
  readonly setFilters: (next: QuoteListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly result: QuoteListResult | null;
  readonly previewRows: readonly QuotePreviewRow[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: QuoteCapabilities;
  readonly referenceData: QuoteReferenceData;
}

export function useQuotes(initialFilters: Partial<QuoteListFilters> = {}, role: Role = ROLES.ADMIN, currentSellerId?: SellerId): UseQuotesResult {
  const [searchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<QuoteListFilters>({ ...DEFAULT_QUOTE_LIST_FILTERS, ...initialFilters });
  const [page, setPageState] = useState(1);
  const [result, setResult] = useState<QuoteListResult | null>(null);
  const [authorizationStatuses, setAuthorizationStatuses] = useState<Record<string, AuthorizationRequestStatus | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const capabilities = useMemo(() => getQuoteCapabilities(role, undefined, currentSellerId), [currentSellerId, role]);
  const referenceData = useMemo(() => getQuoteReferenceDataService(), []);
  const mockError = searchParams.get("mockError") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar las cotizaciones simuladas.");
      }

      const nextResult = await getQuotesService({ filters, page, pageSize: QUOTES_PAGE_SIZE });
      setResult(nextResult);
      const nextStatuses = await Promise.all(
        nextResult.items.map(async (quote) => {
          const approval = await getApprovalByQuoteIdService(quote.id);
          return [quote.id, approval?.request.status ?? null] as const;
        }),
      );
      setAuthorizationStatuses(Object.fromEntries(nextStatuses));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
      setAuthorizationStatuses({});
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

  const previewRows = useMemo<readonly QuotePreviewRow[]>(() => {
    const rows = result?.items ?? [];
    return rows.map((quote) => {
      const clientName = referenceData.clientOptions.find((option) => option.id === quote.clientId)?.label ?? "Cliente no encontrado";
      const sellerName = referenceData.sellerOptions.find((option) => option.id === quote.sellerId)?.label ?? "Sin vendedor";
      const productNames = quote.items.map((item) => item.description);
      const searchText = [quote.number, clientName, sellerName, quote.status, ...productNames].join(" ").toLowerCase();

      return {
        quote,
        clientName,
        sellerName,
        productNames,
        searchText,
        statusLabel: getQuoteStatusLabel(quote.status),
        dueLabel: getQuoteDueLabel(quote.validUntil),
        authorizationStatus: authorizationStatuses[quote.id] ?? null,
        canConvert: isQuoteConvertible(quote),
      };
    });
  }, [authorizationStatuses, referenceData.clientOptions, referenceData.sellerOptions, result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_QUOTE_LIST_FILTERS);
    },
    page,
    setPage: setPageState,
    pageSize: QUOTES_PAGE_SIZE,
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    capabilities,
    referenceData,
  };
}

export function useQuote(quoteId?: QuoteId, role: Role = ROLES.ADMIN, currentSellerId?: SellerId): {
  readonly detail: QuoteDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: QuoteCapabilities;
} {
  const [detail, setDetail] = useState<QuoteDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getQuoteCapabilities(role, detail?.quote, currentSellerId), [currentSellerId, detail?.quote, role]);

  const load = useCallback(async () => {
    if (quoteId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getQuoteDetailDataService(quoteId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

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

export function useCreateQuote(): {
  readonly createQuote: (values: QuoteFormValues) => Promise<Quote>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: QuoteFormValues) => {
    const result = await submitQuoteForm(values);
    return result.quote;
  });

  return { createQuote: run, loading, error };
}

export function useUpdateQuote(quoteId?: QuoteId): {
  readonly updateQuote: (values: QuoteFormValues) => Promise<Quote>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: QuoteFormValues) => {
    const result = await submitQuoteForm(values, quoteId);
    return result.quote;
  });

  const updateQuote = useCallback(
    (values: QuoteFormValues) => {
      if (quoteId === undefined) {
        throw new Error("No se pudo identificar la cotización a editar.");
      }

      return run(values);
    },
    [quoteId, run],
  );

  return { updateQuote, loading, error };
}

export function useConvertQuote(): {
  readonly convertQuote: (quoteId: QuoteId) => Promise<QuoteConversionPreview | null>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(convertQuoteService);

  return { convertQuote: run, loading, error };
}

export function useDuplicateQuote(): {
  readonly duplicateQuote: (quoteId: QuoteId) => Promise<Quote>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (quoteId: QuoteId) => {
    const result = await duplicateQuoteService(quoteId);
    return result.quote;
  });

  return { duplicateQuote: run, loading, error };
}
