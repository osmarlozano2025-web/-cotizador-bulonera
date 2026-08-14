import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ROLES, type Role } from "@/features/auth";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { Order } from "@/domain/order/order";
import type { OrderId, QuoteId, SellerId } from "@/domain/shared";
import type {
  OrderCapabilities,
  OrderDetailData,
  OrderListFilters,
  OrderListResult,
  OrderPreviewRow,
  OrderReferenceData,
} from "../types";
import { DEFAULT_ORDER_LIST_FILTERS, ORDERS_PAGE_SIZE } from "../types";
import { getOrderCapabilities } from "../utils/order-access";
import { getDispatchStatusLabel, getOrderStatusLabel, getTangoStatusLabel } from "../utils/order-labels";
import {
  approveOrder as approveOrderService,
  cancelOrder as cancelOrderService,
  duplicateOrder as duplicateOrderService,
  getOrderDetailData as getOrderDetailDataService,
  getOrderReferenceDataService,
  getOrders as getOrdersService,
  submitOrderForm,
  syncOrderToTango as syncOrderToTangoService,
  transitionOrderStatus as transitionOrderStatusService,
} from "../services/order-service";
import type { OrderFormValues } from "../types";

interface UseOrdersResult {
  readonly filters: OrderListFilters;
  readonly setFilters: (next: OrderListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly result: OrderListResult | null;
  readonly previewRows: readonly OrderPreviewRow[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: OrderCapabilities;
  readonly referenceData: OrderReferenceData;
}

export function useOrders(initialFilters: Partial<OrderListFilters> = {}, role: Role = ROLES.ADMIN, currentSellerId?: SellerId): UseOrdersResult {
  const [searchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<OrderListFilters>({ ...DEFAULT_ORDER_LIST_FILTERS, ...initialFilters });
  const [page, setPageState] = useState(1);
  const [result, setResult] = useState<OrderListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getOrderCapabilities(role, undefined, currentSellerId), [currentSellerId, role]);
  const referenceData = useMemo(() => getOrderReferenceDataService(), []);
  const mockError = searchParams.get("mockError") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar los pedidos simulados.");
      }

      const nextResult = await getOrdersService({ filters, page, pageSize: ORDERS_PAGE_SIZE });
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

  const previewRows = useMemo<readonly OrderPreviewRow[]>(() => {
    const rows = result?.items ?? [];
    return rows.map((order) => {
      const clientName = referenceData.clientOptions.find((option) => option.id === order.clientId)?.label ?? "Cliente no encontrado";
      const sellerName = referenceData.sellerOptions.find((option) => option.id === order.sellerId)?.label ?? "Sin vendedor";
      const searchText = [
        order.number,
        clientName,
        sellerName,
        order.status,
        getOrderStatusLabel(order.status),
        order.items.map((item) => item.description).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const dispatchStatus = order.status === "preparing"
        ? "preparing"
        : order.status === "prepared"
          ? "prepared"
          : order.status === "readyForDispatch"
            ? "ready"
            : order.status === "dispatched"
              ? "dispatched"
              : "pending";
      const tangoStatus = order.status === "sentToTango"
        ? "processing"
        : order.status === "invoiced"
          ? "sent"
          : order.status === "cancelled"
            ? "error"
            : "pending";

      return {
        order,
        clientName,
        sellerName,
        statusLabel: getOrderStatusLabel(order.status),
        dispatchLabel: getDispatchStatusLabel(dispatchStatus),
        tangoLabel: getTangoStatusLabel(tangoStatus),
        searchText,
        hasDebt: order.status === "pendingApproval",
        pendingApproval: order.status === "pendingApproval",
      };
    });
  }, [referenceData.clientOptions, referenceData.sellerOptions, result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_ORDER_LIST_FILTERS);
    },
    page,
    setPage: setPageState,
    pageSize: ORDERS_PAGE_SIZE,
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    capabilities,
    referenceData,
  };
}

export function useOrder(orderId?: OrderId, role: Role = ROLES.ADMIN, currentSellerId?: SellerId): {
  readonly detail: OrderDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: OrderCapabilities;
} {
  const [detail, setDetail] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getOrderCapabilities(role, detail?.order, currentSellerId), [currentSellerId, detail?.order, role]);

  const load = useCallback(async () => {
    if (orderId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getOrderDetailDataService(orderId);
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

  return {
    detail,
    loading,
    error,
    refresh: load,
    capabilities,
  };
}

export function useCreateOrder(): {
  readonly createOrder: (values: OrderFormValues, sourceQuoteId?: QuoteId) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: OrderFormValues, sourceQuoteId?: QuoteId) => {
    const result = await submitOrderForm(values, undefined, sourceQuoteId);
    return result.order;
  });

  return { createOrder: run, loading, error };
}

export function useUpdateOrder(orderId?: OrderId): {
  readonly updateOrder: (values: OrderFormValues) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: OrderFormValues) => {
    const result = await submitOrderForm(values, orderId);
    return result.order;
  });

  const updateOrder = useCallback(
    (values: OrderFormValues) => {
      if (orderId === undefined) {
        throw new Error("No se pudo identificar el pedido a editar.");
      }

      return run(values);
    },
    [orderId, run],
  );

  return { updateOrder, loading, error };
}

export function useDuplicateOrder(): {
  readonly duplicateOrder: (orderId: OrderId) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (orderId: OrderId) => {
    const result = await duplicateOrderService(orderId);
    return result.order;
  });

  return { duplicateOrder: run, loading, error };
}

export function useApproveOrder(): {
  readonly approveOrder: (orderId: OrderId) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (orderId: OrderId) => {
    const result = await approveOrderService(orderId);
    return result.order;
  });

  return { approveOrder: run, loading, error };
}

export function useCancelOrder(): {
  readonly cancelOrder: (orderId: OrderId) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (orderId: OrderId) => {
    const result = await cancelOrderService(orderId);
    return result.order;
  });

  return { cancelOrder: run, loading, error };
}

export function useOrderStatusActions(): {
  readonly syncOrderToTango: (orderId: OrderId) => Promise<Order>;
  readonly transitionOrderStatus: (orderId: OrderId, nextStatus: Order["status"]) => Promise<Order>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction((action: () => Promise<Order>) => action());

  const syncOrderToTango = useCallback((orderId: OrderId) => run(async () => (await syncOrderToTangoService(orderId)).order), [run]);
  const transition = useCallback((orderId: OrderId, nextStatus: Order["status"]) => run(async () => (await transitionOrderStatusService(orderId, nextStatus)).order), [run]);

  return { syncOrderToTango, transitionOrderStatus: transition, loading, error };
}

