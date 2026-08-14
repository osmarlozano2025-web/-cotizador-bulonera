import type { OrderId } from "@/domain/shared";
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

export interface DispatchRepository {
  getDispatchGuides(query?: DispatchGuideListQuery): Promise<DispatchGuideListResult>;
  getDispatchGuideById(dispatchGuideId: string): Promise<DispatchGuideDetail | null>;
  getDispatchGuideByOrderId(orderId: OrderId): Promise<DispatchGuideDetail | null>;
  createDispatchGuide(orderId: OrderId, values?: Partial<DispatchGuideFormValues>): Promise<DispatchActionResult>;
  updateDispatchGuide(dispatchGuideId: string, values: Partial<DispatchGuideFormValues>): Promise<DispatchActionResult>;
  markDispatchGuideReady(dispatchGuideId: string): Promise<DispatchActionResult>;
  assignDriver(dispatchGuideId: string, driverId: string): Promise<DispatchActionResult>;
  assignVehicle(dispatchGuideId: string, vehicleId: string): Promise<DispatchActionResult>;
  scheduleDelivery(dispatchGuideId: string, values: Pick<DispatchGuideFormValues, "scheduledDate" | "scheduledTimeRange" | "observations">): Promise<DispatchActionResult>;
  dispatchOrder(dispatchGuideId: string): Promise<DispatchActionResult>;
  confirmDelivery(dispatchGuideId: string, values: DispatchDeliveryConfirmationValues): Promise<DispatchActionResult>;
  markDeliveryFailed(dispatchGuideId: string, values: DispatchDeliveryFailureValues): Promise<DispatchActionResult>;
  rescheduleDelivery(dispatchGuideId: string, values: DispatchDeliveryRescheduleValues): Promise<DispatchActionResult>;
  cancelDispatch(dispatchGuideId: string, reason?: string): Promise<DispatchActionResult>;
  getDispatchHistory(dispatchGuideId?: string): Promise<readonly DispatchHistoryEntry[]>;
  getReferenceData(): DispatchReferenceData;
}
