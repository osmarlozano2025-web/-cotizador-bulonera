import { useCallback, useEffect, useState } from "react";
import type { OrderId } from "@/domain/shared";
import { useAsyncAction } from "@/hooks/use-async-action";
import { assignDriver as assignDriverService, assignVehicle as assignVehicleService, cancelDispatch as cancelDispatchService, confirmDelivery as confirmDeliveryService, createDispatchGuide as createDispatchGuideService, dispatchOrder as dispatchOrderService, getDispatchGuideById as getDispatchGuideByIdService, getDispatchGuides as getDispatchGuidesService, getDispatchHistory as getDispatchHistoryService, getDispatchReferenceData, markDispatchGuideReady as markDispatchGuideReadyService, markDeliveryFailed as markDeliveryFailedService, rescheduleDelivery as rescheduleDeliveryService, updateDispatchGuide as updateDispatchGuideService } from "../services/dispatch-service";
import type {
  DispatchActionResult,
  DispatchDeliveryConfirmationValues,
  DispatchDeliveryFailureValues,
  DispatchDeliveryRescheduleValues,
  DispatchFilters,
  DispatchGuideDetail,
  DispatchGuideFormValues,
  DispatchGuideListResult,
  DispatchHistoryEntry,
  DispatchReferenceData,
} from "../types";

export function useDispatchGuides(filters: DispatchFilters, page = 1, pageSize = 10): {
  readonly result: DispatchGuideListResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly referenceData: DispatchReferenceData;
} {
  const [result, setResult] = useState<DispatchGuideListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const referenceData = getDispatchReferenceData();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await getDispatchGuidesService({ filters, page, pageSize });
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

  return { result, loading, error, refresh: load, referenceData };
}

export function useDispatchGuide(dispatchGuideId?: string): {
  readonly detail: DispatchGuideDetail | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly history: readonly DispatchHistoryEntry[];
} {
  const [detail, setDetail] = useState<DispatchGuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly DispatchHistoryEntry[]>([]);

  const load = useCallback(async () => {
    if (dispatchGuideId === undefined) {
      setDetail(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getDispatchGuideByIdService(dispatchGuideId);
      setDetail(nextDetail);
      setHistory(await getDispatchHistoryService(dispatchGuideId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [dispatchGuideId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  return { detail, loading, error, refresh: load, history };
}

export function useCreateDispatchGuide(): {
  readonly createDispatchGuide: (orderId: OrderId, values?: Partial<DispatchGuideFormValues>) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(createDispatchGuideService);

  return { createDispatchGuide: run, loading, error };
}

export function useUpdateDispatchGuide(): {
  readonly updateDispatchGuide: (dispatchGuideId: string, values: Partial<DispatchGuideFormValues>) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(updateDispatchGuideService);

  return { updateDispatchGuide: run, loading, error };
}

export function useMarkDispatchGuideReady(): {
  readonly markDispatchGuideReady: (dispatchGuideId: string) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(markDispatchGuideReadyService);

  return { markDispatchGuideReady: run, loading, error };
}

export function useAssignDispatch(): {
  readonly assignDriver: (dispatchGuideId: string, driverId: string) => Promise<DispatchActionResult>;
  readonly assignVehicle: (dispatchGuideId: string, vehicleId: string) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction((action: () => Promise<DispatchActionResult>) => action());

  const assignDriver = useCallback((dispatchGuideId: string, driverId: string) => run(() => assignDriverService(dispatchGuideId, driverId)), [run]);
  const assignVehicle = useCallback((dispatchGuideId: string, vehicleId: string) => run(() => assignVehicleService(dispatchGuideId, vehicleId)), [run]);

  return { assignDriver, assignVehicle, loading, error };
}

export function useDispatchOrder(): {
  readonly dispatchOrder: (dispatchGuideId: string) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(dispatchOrderService);

  return { dispatchOrder: run, loading, error };
}

export function useConfirmDelivery(): {
  readonly confirmDelivery: (dispatchGuideId: string, values: DispatchDeliveryConfirmationValues) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(confirmDeliveryService);

  return { confirmDelivery: run, loading, error };
}

export function useMarkDeliveryFailed(): {
  readonly markDeliveryFailed: (dispatchGuideId: string, values: DispatchDeliveryFailureValues) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(markDeliveryFailedService);

  return { markDeliveryFailed: run, loading, error };
}

export function useRescheduleDelivery(): {
  readonly rescheduleDelivery: (dispatchGuideId: string, values: DispatchDeliveryRescheduleValues) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(rescheduleDeliveryService);

  return { rescheduleDelivery: run, loading, error };
}

export function useCancelDispatch(): {
  readonly cancelDispatch: (dispatchGuideId: string, reason?: string) => Promise<DispatchActionResult>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(cancelDispatchService);

  return { cancelDispatch: run, loading, error };
}
