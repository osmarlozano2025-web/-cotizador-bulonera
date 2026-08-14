import type { DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import type { Delivery, DeliveryStatus } from "@/domain/dispatch/delivery";
import type { Client, ClientAddress } from "@/domain/client/client";
import type { Order, OrderStatus } from "@/domain/order/order";
import type { BranchId, ClientId, CompanyId, OrderId, ProductId, UserId } from "@/domain/shared";
import type { DispatchGuideDetail } from "@/features/dispatch/types";
import type { ISODateString } from "@/types/identity";

export type PreparationStatus = "pending" | "preparing" | "partial" | "prepared" | "ready";

export type MissingItemReason =
  | "outOfStock"
  | "damaged"
  | "incorrectProduct"
  | "locationNotFound"
  | "pendingReplenishment"
  | "other";

export type MissingItemResolutionStatus = "pending" | "accepted" | "replaced" | "cancelled" | "resolved";

export interface LogisticsMissingItem {
  readonly id: string;
  readonly productId: ProductId;
  readonly productCode: string;
  readonly productDescription: string;
  readonly requestedQuantity: number;
  readonly preparedQuantity: number;
  readonly missingQuantity: number;
  readonly reason: MissingItemReason;
  readonly notes?: string;
  readonly reportedBy: UserId;
  readonly reportedAt: ISODateString;
  readonly resolutionStatus: MissingItemResolutionStatus;
}

export interface LogisticsPreparationItem {
  readonly id: string;
  readonly productId: ProductId;
  readonly code: string;
  readonly description: string;
  readonly requestedQuantity: number;
  readonly preparedQuantity: number;
  readonly missingQuantity: number;
  readonly unitOfMeasure: string;
  readonly location: string;
  readonly notes?: string;
  readonly status: "pending" | "partial" | "prepared" | "missing" | "replaced" | "cancelled";
}

export interface LogisticsHistoryEntry {
  readonly id: string;
  readonly orderId: OrderId;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: OrderStatus | PreparationStatus | DispatchGuideStatus | DeliveryStatus;
}

export interface LogisticsOrderSummary {
  readonly orderId: OrderId;
  readonly orderNumber: string;
  readonly orderDate: ISODateString;
  readonly clientId: ClientId;
  readonly clientName: string;
  readonly tradeName: string | undefined;
  readonly locality: string;
  readonly branchId: BranchId;
  readonly sellerName: string | undefined;
  readonly productsCount: number;
  readonly unitsCount: number;
  readonly orderStatus: OrderStatus;
  readonly preparationStatus: PreparationStatus;
  readonly dispatchStatus: DispatchGuideStatus | "none";
  readonly deliveryStatus: DeliveryStatus | "none";
  readonly expectedDate: ISODateString | undefined;
  readonly dispatchGuideId: string | undefined;
  readonly dispatchGuideNumber: string | undefined;
  readonly driverName: string | undefined;
  readonly vehicleCode: string | undefined;
  readonly deliveryZone: string | undefined;
  readonly hasMissingItems: boolean;
  readonly pendingAuthorization: boolean;
  readonly blockedByCredit: boolean;
  readonly canStartPreparation: boolean;
  readonly canContinuePreparation: boolean;
  readonly canCreateGuide: boolean;
  readonly canDispatch: boolean;
  readonly canViewGuide: boolean;
}

export interface LogisticsOrderDetail extends LogisticsOrderSummary {
  readonly companyId: CompanyId;
  readonly order: Order;
  readonly client: Client;
  readonly address: ClientAddress;
  readonly items: readonly LogisticsPreparationItem[];
  readonly missingItems: readonly LogisticsMissingItem[];
  readonly guide: DispatchGuideDetail | undefined;
  readonly delivery: Delivery | undefined;
  readonly history: readonly LogisticsHistoryEntry[];
  readonly observations: string | undefined;
}

export interface LogisticsSummary {
  readonly pendingPreparation: number;
  readonly preparing: number;
  readonly withMissingItems: number;
  readonly readyForDispatch: number;
  readonly dispatchedToday: number;
  readonly pendingDeliveries: number;
}

export interface LogisticsReferenceData {
  readonly orderStatusOptions: readonly { id: OrderStatus | "all"; label: string }[];
  readonly preparationStatusOptions: readonly { id: PreparationStatus | "all"; label: string }[];
  readonly dispatchStatusOptions: readonly { id: DispatchGuideStatus | "none" | "all"; label: string }[];
  readonly branchOptions: readonly { id: BranchId | "all"; label: string }[];
  readonly zoneOptions: readonly { id: string; label: string }[];
  readonly driverOptions: readonly { id: string; label: string }[];
  readonly vehicleOptions: readonly { id: string; label: string }[];
}

export interface LogisticsFilters {
  readonly search: string;
  readonly orderStatus: OrderStatus | "all";
  readonly preparationStatus: PreparationStatus | "all";
  readonly dispatchStatus: DispatchGuideStatus | "none" | "all";
  readonly branchId: BranchId | "all";
  readonly zoneId: string;
  readonly driverId: string;
  readonly vehicleId: string;
  readonly hasMissingItems: boolean | "all";
  readonly noGuide: boolean | "all";
  readonly readyForDispatch: boolean | "all";
  readonly deliveryPending: boolean | "all";
  readonly deliveryFailed: boolean | "all";
  readonly dateRange: "all" | "today" | "last7Days" | "last30Days";
}

export const DEFAULT_LOGISTICS_FILTERS: LogisticsFilters = {
  search: "",
  orderStatus: "all",
  preparationStatus: "all",
  dispatchStatus: "all",
  branchId: "all",
  zoneId: "all",
  driverId: "all",
  vehicleId: "all",
  hasMissingItems: "all",
  noGuide: "all",
  readyForDispatch: "all",
  deliveryPending: "all",
  deliveryFailed: "all",
  dateRange: "all",
} as const;

export const LOGISTICS_PAGE_SIZE = 10;

export interface LogisticsListQuery {
  readonly filters: LogisticsFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface LogisticsActionResult {
  readonly orderId: OrderId;
  readonly detail: LogisticsOrderDetail;
}

export interface LogisticsSummaryResult {
  readonly summary: LogisticsSummary;
}

export interface LogisticsListResult {
  readonly items: readonly LogisticsOrderSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
