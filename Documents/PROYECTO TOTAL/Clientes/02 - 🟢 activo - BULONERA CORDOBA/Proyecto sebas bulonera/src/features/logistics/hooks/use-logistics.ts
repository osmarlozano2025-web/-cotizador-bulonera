import { useCallback, useEffect, useState } from "react";
import type { OrderId } from "@/domain/shared";
import { useAsyncAction } from "@/hooks/use-async-action";
import { completeOrderPreparation as completeOrderPreparationService, getLogisticsHistory as getLogisticsHistoryService, getLogisticsSummary as getLogisticsSummaryService, getOperationalOrderById as getOperationalOrderByIdService, getOperationalOrders as getOperationalOrdersService, markOrderReadyForDispatch as markOrderReadyForDispatchService, registerMissingItem as registerMissingItemService, startOrderPreparation as startOrderPreparationService, updatePreparedQuantity as updatePreparedQuantityService } from "../services/logistics-service";
import type {
  LogisticsActionResult,
  LogisticsFilters,
  LogisticsHistoryEntry,
  LogisticsListResult,
  LogisticsMissingItem,
  LogisticsOrderDetail,
  LogisticsSummary,
  LogisticsSummaryResult,
} from "../types";

export function useOperationalOrders(filters: LogisticsFilters, page = 1, pageSize = 10): {
  readonly result: LogisticsListResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
} {
  const [result, setResult] = useState<LogisticsListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await getOperationalOrdersService({ filters, page, pageSize });
      setResult(nextResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  return { result, loading, error, refresh: load };
}

export function useOperationalOrder(orderId?: OrderId): {
  readonly detail: LogisticsOrderDetail | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
} {
  const [detail, setDetail] = useState<LogisticsOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (orderId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getOperationalOrderByIdService(orderId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  return { detail, loading, error, refresh: load };
}

export function useLogisticsSummary(): {
  readonly summary: LogisticsSummary | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
} {
  const [result, setResult] = useState<LogisticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult: LogisticsSummaryResult = await getLogisticsSummaryService();
      setResult(nextResult.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  return { summary: result, loading, error, refresh: load };
}

export function useStartOrderPreparation(): {
  readonly startOrderPreparation: (orderId: OrderId) => Promise<LogisticsActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(startOrderPreparationService);

  return { startOrderPreparation: run, loading, error };
}

export function useUpdatePreparedQuantity(): {
  readonly updatePreparedQuantity: (orderId: OrderId, itemId: string, preparedQuantity: number) => Promise<LogisticsActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(updatePreparedQuantityService);

  return { updatePreparedQuantity: run, loading, error };
}

export function useRegisterMissingItem(): {
  readonly registerMissingItem: (orderId: OrderId, input: Omit<LogisticsMissingItem, "id" | "reportedAt">) => Promise<LogisticsActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(registerMissingItemService);

  return { registerMissingItem: run, loading, error };
}

export function useCompleteOrderPreparation(): {
  readonly completeOrderPreparation: (orderId: OrderId) => Promise<LogisticsActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(completeOrderPreparationService);

  return { completeOrderPreparation: run, loading, error };
}

export function useMarkReadyForDispatch(): {
  readonly markOrderReadyForDispatch: (orderId: OrderId) => Promise<LogisticsActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(markOrderReadyForDispatchService);

  return { markOrderReadyForDispatch: run, loading, error };
}

export function useLogisticsHistory(orderId?: OrderId): {
  readonly history: readonly LogisticsHistoryEntry[];
} {
  const [history, setHistory] = useState<readonly LogisticsHistoryEntry[]>([]);

  useEffect(() => {
    let alive = true;
    void getLogisticsHistoryService(orderId).then((nextHistory) => {
      if (alive) {
        setHistory(nextHistory);
      }
    }).catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [orderId]);

  return { history };
}
