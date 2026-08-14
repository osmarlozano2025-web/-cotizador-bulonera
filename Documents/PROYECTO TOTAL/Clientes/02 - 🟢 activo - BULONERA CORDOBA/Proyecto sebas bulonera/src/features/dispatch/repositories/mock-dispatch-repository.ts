import type { DispatchGuideId, OrderId } from "@/domain/shared";
import { transitionOrderStatus } from "@/features/orders/services/order-service";
import {
  assignDriver as assignDriverData,
  assignVehicle as assignVehicleData,
  cancelDispatch as cancelDispatchData,
  confirmDelivery as confirmDeliveryData,
  createDispatchGuide as createDispatchGuideData,
  dispatchOrder as dispatchOrderData,
  getDispatchGuideByOrderId as getDispatchGuideByOrderIdData,
  getDispatchGuideDetail as getDispatchGuideDetailData,
  getDispatchGuideList as getDispatchGuideListData,
  getDispatchReferenceData,
  markDispatchGuideReady as markDispatchGuideReadyData,
  rescheduleDelivery as rescheduleDeliveryData,
  scheduleDelivery as scheduleDeliveryData,
  updateDispatchGuide as updateDispatchGuideData,
  markDeliveryFailed as markDeliveryFailedData,
} from "@/features/logistics/data/mock-logistics";
import type {
  DispatchActionResult,
  DispatchDeliveryConfirmationValues,
  DispatchDeliveryFailureValues,
  DispatchDeliveryRescheduleValues,
  DispatchGuideDetail,
  DispatchGuideFormValues,
  DispatchGuideListQuery,
  DispatchGuideListResult,
  DispatchHistoryEntry,
  DispatchReferenceData,
} from "../types";
import type { DispatchRepository } from "./dispatch-repository";
import { assertDispatchGuideTransition } from "../utils/dispatch-rules";

const delay = async (milliseconds = 120): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function toDispatchActionResult(dispatchGuideId: string, guide: DispatchGuideDetail): DispatchActionResult {
  return { dispatchGuideId: dispatchGuideId as DispatchGuideId, guide };
}

function getDispatchGuideOrThrow(dispatchGuideId: string): DispatchGuideDetail {
  const guide = getDispatchGuideDetailData(dispatchGuideId as DispatchGuideId);
  if (guide === null) {
    throw new Error("Guía no encontrada.");
  }

  return guide;
}

export class MockDispatchRepository implements DispatchRepository {
  async getDispatchGuides(query?: DispatchGuideListQuery): Promise<DispatchGuideListResult> {
    await delay();
    const guides = getDispatchGuideListData();
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? guides.length;
    const normalized = query?.filters.search.trim().toLowerCase() ?? "";
    const filtered = guides.filter((guide) => {
      const searchText = [
        guide.number,
        guide.orderNumber,
        guide.clientName,
        guide.tradeName ?? "",
        guide.locality,
        guide.driverName ?? "",
        guide.vehicleCode ?? "",
        guide.zoneName ?? "",
      ].join(" ").toLowerCase();
      const matchesSearch = normalized.length === 0 || searchText.includes(normalized);
      const matchesStatus = query?.filters.status === undefined || query.filters.status === "all" || guide.status === query.filters.status;
      const matchesDelivery = query?.filters.deliveryStatus === undefined || query.filters.deliveryStatus === "all" || guide.deliveryStatus === query.filters.deliveryStatus;
      const matchesBranch = query?.filters.branchId === undefined || query.filters.branchId === "all" || guide.branchId === query.filters.branchId;
      const matchesDriver = query?.filters.driverId === undefined || query.filters.driverId === "all" || guide.driverId === query.filters.driverId;
      const matchesVehicle = query?.filters.vehicleId === undefined || query.filters.vehicleId === "all" || guide.vehicleId === query.filters.vehicleId;
      const matchesZone = query?.filters.zoneId === undefined || query.filters.zoneId === "all" || guide.zoneId === query.filters.zoneId;
      const matchesGuide = query?.filters.hasGuide === undefined || query.filters.hasGuide === "all" || (query.filters.hasGuide ? guide.items.length > 0 : guide.items.length === 0);
      const matchesScheduled = query?.filters.scheduledOnly === undefined || query.filters.scheduledOnly === "all" || (query.filters.scheduledOnly ? guide.scheduledDate !== undefined : true);
      const matchesPending = query?.filters.deliveryPending === undefined || query.filters.deliveryPending === "all" || (query.filters.deliveryPending ? guide.deliveryStatus === "pending" : true);
      const matchesFailed = query?.filters.deliveryFailed === undefined || query.filters.deliveryFailed === "all" || (query.filters.deliveryFailed ? guide.deliveryStatus === "failed" : true);
      return matchesSearch && matchesStatus && matchesDelivery && matchesBranch && matchesDriver && matchesVehicle && matchesZone && matchesGuide && matchesScheduled && matchesPending && matchesFailed;
    });

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((guide) => ({
      ...guide,
    }));

    return { items, total: filtered.length, page, pageSize };
  }

  async getDispatchGuideById(dispatchGuideId: string): Promise<DispatchGuideDetail | null> {
    await delay(40);
    return getDispatchGuideDetailData(dispatchGuideId as DispatchGuideId);
  }

  async getDispatchGuideByOrderId(orderId: OrderId): Promise<DispatchGuideDetail | null> {
    await delay(40);
    return getDispatchGuideByOrderIdData(orderId);
  }

  async createDispatchGuide(orderId: OrderId, values?: Partial<DispatchGuideFormValues>): Promise<DispatchActionResult> {
    await delay(60);
    const guide = createDispatchGuideData(orderId, values);
    await transitionOrderStatus(orderId, "readyForDispatch");
    return toDispatchActionResult(guide.id, guide);
  }

  async updateDispatchGuide(dispatchGuideId: string, values: Partial<DispatchGuideFormValues>): Promise<DispatchActionResult> {
    await delay(60);
    const guideId = dispatchGuideId as DispatchGuideId;
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);

    const nextDriverId = values.driverId?.trim() ?? "";
    const nextVehicleId = values.vehicleId?.trim() ?? "";

    if (nextDriverId.length > 0 && (currentGuide.status === "pending" || nextDriverId !== currentGuide.driverId)) {
      assignDriverData(guideId, nextDriverId);
    }

    if (nextVehicleId.length > 0 && (currentGuide.status === "pending" || nextVehicleId !== currentGuide.vehicleId)) {
      assignVehicleData(guideId, nextVehicleId);
    }

    const guide = updateDispatchGuideData(guideId, values);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async markDispatchGuideReady(dispatchGuideId: string): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "ready");
    const guide = markDispatchGuideReadyData(dispatchGuideId as DispatchGuideId);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async assignDriver(dispatchGuideId: string, driverId: string): Promise<DispatchActionResult> {
    await delay(60);
    const guide = assignDriverData(dispatchGuideId as DispatchGuideId, driverId);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async assignVehicle(dispatchGuideId: string, vehicleId: string): Promise<DispatchActionResult> {
    await delay(60);
    const guide = assignVehicleData(dispatchGuideId as DispatchGuideId, vehicleId);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async scheduleDelivery(dispatchGuideId: string, values: Pick<DispatchGuideFormValues, "scheduledDate" | "scheduledTimeRange" | "observations">): Promise<DispatchActionResult> {
    await delay(60);
    const guide = scheduleDeliveryData(dispatchGuideId as DispatchGuideId, values);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async dispatchOrder(dispatchGuideId: string): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "dispatched");
    const guide = dispatchOrderData(dispatchGuideId as DispatchGuideId);
    await transitionOrderStatus(guide.orderId, "dispatched");
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async confirmDelivery(dispatchGuideId: string, values: DispatchDeliveryConfirmationValues): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "delivered");
    const guide = confirmDeliveryData(dispatchGuideId as DispatchGuideId, values);
    await transitionOrderStatus(guide.orderId, "delivered");
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async markDeliveryFailed(dispatchGuideId: string, values: DispatchDeliveryFailureValues): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "failed");
    const guide = markDeliveryFailedData(dispatchGuideId as DispatchGuideId, values);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async rescheduleDelivery(dispatchGuideId: string, values: DispatchDeliveryRescheduleValues): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "rescheduled");
    const guide = rescheduleDeliveryData(dispatchGuideId as DispatchGuideId, values);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async cancelDispatch(dispatchGuideId: string, reason?: string): Promise<DispatchActionResult> {
    await delay(60);
    const currentGuide = getDispatchGuideOrThrow(dispatchGuideId);
    assertDispatchGuideTransition(currentGuide, "cancelled");
    const guide = cancelDispatchData(dispatchGuideId as DispatchGuideId, reason);
    return toDispatchActionResult(dispatchGuideId, guide);
  }

  async getDispatchHistory(dispatchGuideId?: string): Promise<readonly DispatchHistoryEntry[]> {
    await delay(30);
    if (dispatchGuideId === undefined) {
      return [];
    }

    const guide = getDispatchGuideDetailData(dispatchGuideId as DispatchGuideId);
    return guide?.history ?? [];
  }

  getReferenceData(): DispatchReferenceData {
    return getDispatchReferenceData();
  }
}
