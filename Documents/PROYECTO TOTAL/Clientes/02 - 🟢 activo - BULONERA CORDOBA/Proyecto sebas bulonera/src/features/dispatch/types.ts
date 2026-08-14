import type { DispatchGuide, DispatchGuideItem, DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import type { Delivery, DeliveryFailureReason, DeliveryStatus } from "@/domain/dispatch/delivery";
import type { ClientAddress, Client } from "@/domain/client/client";
import type { Order } from "@/domain/order/order";
import type { BranchId, CompanyId, DispatchGuideId, OrderId, UserId } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export interface DispatchDriver {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly userId?: UserId;
  readonly name: string;
  readonly phone?: string;
  readonly status: "available" | "assigned" | "inactive";
}

export interface DispatchVehicle {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly code: string;
  readonly plate: string;
  readonly description: string;
  readonly capacity?: number;
  readonly status: "available" | "assigned" | "maintenance" | "inactive";
}

export interface DispatchZone {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly name: string;
  readonly description?: string;
  readonly localities: readonly string[];
  readonly status: "active" | "inactive";
}

export interface DispatchGuideSummary extends Omit<DispatchGuide, "driverName" | "vehicle" | "scheduledDate" | "deliveredAt" | "observations"> {
  readonly orderNumber: string;
  readonly clientName: string;
  readonly tradeName: string | undefined;
  readonly locality: string;
  readonly driverName: string | undefined;
  readonly driverId: string | undefined;
  readonly vehicleId: string | undefined;
  readonly vehicleCode: string | undefined;
  readonly vehicle: string | undefined;
  readonly zoneId: string | undefined;
  readonly zoneName: string | undefined;
  readonly scheduledTimeRange: string | undefined;
  readonly deliveryStatus: DeliveryStatus;
  readonly scheduledDate: string | undefined;
  readonly deliveredAt: string | undefined;
  readonly observations: string | undefined;
}

export interface DispatchGuideDetail extends DispatchGuideSummary {
  readonly order: Order;
  readonly client: Client;
  readonly address: ClientAddress;
  readonly items: readonly DispatchGuideItem[];
  readonly delivery: Delivery | undefined;
  readonly history: readonly DispatchHistoryEntry[];
}

export interface DispatchHistoryEntry {
  readonly id: string;
  readonly dispatchGuideId: DispatchGuideId;
  readonly orderId: OrderId;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: Order["status"] | DispatchGuideStatus | DeliveryStatus;
}

export interface DispatchFilters {
  readonly search: string;
  readonly status: DispatchGuideStatus | "all";
  readonly deliveryStatus: DeliveryStatus | "all";
  readonly branchId: BranchId | "all";
  readonly driverId: string;
  readonly vehicleId: string;
  readonly zoneId: string;
  readonly hasGuide: boolean | "all";
  readonly scheduledOnly: boolean | "all";
  readonly deliveryPending: boolean | "all";
  readonly deliveryFailed: boolean | "all";
}

export const DEFAULT_DISPATCH_FILTERS: DispatchFilters = {
  search: "",
  status: "all",
  deliveryStatus: "all",
  branchId: "all",
  driverId: "all",
  vehicleId: "all",
  zoneId: "all",
  hasGuide: "all",
  scheduledOnly: "all",
  deliveryPending: "all",
  deliveryFailed: "all",
} as const;

export const DISPATCH_PAGE_SIZE = 10;

export interface DispatchGuideListQuery {
  readonly filters: DispatchFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface DispatchGuideFormValues {
  readonly driverId: string;
  readonly vehicleId: string;
  readonly zoneId: string;
  readonly scheduledDate: string;
  readonly scheduledTimeRange: string;
  readonly observations: string;
}

export interface DispatchDeliveryConfirmationValues {
  readonly recipientName: string;
  readonly recipientDocument: string;
  readonly notes: string;
}

export interface DispatchDeliveryFailureValues {
  readonly reason: DeliveryFailureReason;
  readonly notes: string;
}

export interface DispatchDeliveryRescheduleValues {
  readonly rescheduledDate: string;
  readonly notes: string;
}

export interface DispatchActionResult {
  readonly dispatchGuideId: DispatchGuideId;
  readonly guide: DispatchGuideDetail;
}

export interface DispatchReferenceData {
  readonly driverOptions: readonly { id: string; label: string }[];
  readonly vehicleOptions: readonly { id: string; label: string }[];
  readonly zoneOptions: readonly { id: string; label: string }[];
  readonly deliveryStatusOptions: readonly { id: DeliveryStatus | "all"; label: string }[];
  readonly dispatchStatusOptions: readonly { id: DispatchGuideStatus | "all"; label: string }[];
}

export interface DispatchGuideListResult {
  readonly items: readonly DispatchGuideSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
