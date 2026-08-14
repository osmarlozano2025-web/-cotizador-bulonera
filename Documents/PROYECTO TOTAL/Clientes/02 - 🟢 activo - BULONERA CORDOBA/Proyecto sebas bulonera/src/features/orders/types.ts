import type { ClientAddressId, ClientId, ProductId, QuoteId, SellerId } from "@/domain/shared";
import type { Order, OrderStatus, PaymentCondition } from "@/domain/order/order";
import type { AccountStatus, ClientCommercialStatus } from "@/domain/client/types";
import type { ClientDebt } from "@/domain/client/client";
import type { ISODateString } from "@/types/identity";

export type OrderDispatchStatus = "pending" | "preparing" | "prepared" | "ready" | "dispatched";
export type OrderTangoStatus = "pending" | "processing" | "sent" | "error";
export type OrderApprovalStatus = "notRequired" | "pending" | "approved" | "rejected";
export type OrderDateRangeFilter = "all" | "currentMonth" | "last30Days";
export type OrderQuickViewFilter =
  | "all"
  | "withDebt"
  | "pendingApproval"
  | "preparing"
  | "dispatch"
  | "sentToTango"
  | "invoiced";

export interface OrderListFilters {
  readonly search: string;
  readonly status: OrderStatus | "all";
  readonly clientId: ClientId | "all";
  readonly sellerId: SellerId | "all" | "unassigned";
  readonly dateRange: OrderDateRangeFilter;
  readonly quickView: OrderQuickViewFilter;
}

export const DEFAULT_ORDER_LIST_FILTERS: OrderListFilters = {
  search: "",
  status: "all",
  clientId: "all",
  sellerId: "all",
  dateRange: "all",
  quickView: "all",
} as const;

export const ORDERS_PAGE_SIZE = 8;

export interface OrderListQuery {
  readonly filters: OrderListFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrderProductOption {
  readonly id: ProductId;
  readonly code: string;
  readonly name: string;
  readonly basePrice: number;
  readonly unitLabel: string;
}

export interface OrderClientAddressOption {
  readonly id: ClientAddressId;
  readonly label: string;
}

export interface OrderReferenceData {
  readonly clientOptions: readonly { id: ClientId; label: string; commercialStatus: ClientCommercialStatus; status: AccountStatus }[];
  readonly sellerOptions: readonly { id: SellerId; label: string }[];
  readonly productOptions: readonly OrderProductOption[];
  readonly addressesByClientId: Readonly<Record<string, readonly OrderClientAddressOption[]>>;
  readonly quoteOptions: readonly { id: QuoteId; label: string }[];
}

export interface OrderFormItemValues {
  readonly id: string;
  readonly productId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: number;
  readonly notes: string;
}

export interface OrderFormValues {
  readonly clientId: string;
  readonly sellerId: string;
  readonly paymentCondition: PaymentCondition;
  readonly deliveryAddressId: string;
  readonly notes: string;
  readonly sourceQuoteId: string;
  readonly items: OrderFormItemValues[];
}

export interface OrderFormDefaults extends OrderFormValues {
  readonly currentOrderId?: string;
}

export interface OrderFormSubmitInput {
  readonly formValues: OrderFormValues;
  readonly currentOrderId?: string;
  readonly sourceQuoteId?: QuoteId;
}

export interface OrderTotalsSummary {
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly itemsCount: number;
  readonly unitsCount: number;
}

export interface OrderAuthorizationReason {
  readonly code: "debt" | "discount" | "creditLimit" | "commercial";
  readonly label: string;
}

export interface OrderAuthorizationSummary {
  readonly required: boolean;
  readonly status: OrderApprovalStatus;
  readonly reasons: readonly OrderAuthorizationReason[];
  readonly creditSnapshot: ClientDebt;
}

export interface OrderDispatchSummary {
  readonly status: OrderDispatchStatus;
  readonly label: string;
  readonly updatedAt: ISODateString;
}

export interface OrderTangoSummary {
  readonly status: OrderTangoStatus;
  readonly label: string;
  readonly updatedAt: ISODateString;
}

export interface OrderHistoryEntry {
  readonly id: string;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: OrderStatus;
}

export interface OrderDetailData {
  readonly order: Order;
  readonly clientName: string;
  readonly sellerName?: string;
  readonly deliveryAddressLabel?: string;
  readonly sourceQuoteNumber?: string;
  readonly totals: OrderTotalsSummary;
  readonly history: readonly OrderHistoryEntry[];
  readonly authorization: OrderAuthorizationSummary;
  readonly dispatch: OrderDispatchSummary;
  readonly tango: OrderTangoSummary;
  readonly creditSnapshot: ClientDebt;
  readonly clientCommercialStatus: ClientCommercialStatus;
  readonly clientAccountStatus: AccountStatus;
  readonly clientBlocked: boolean;
}

export interface OrderPreviewRow {
  readonly order: Order;
  readonly clientName: string;
  readonly sellerName: string;
  readonly statusLabel: string;
  readonly dispatchLabel: string;
  readonly tangoLabel: string;
  readonly searchText: string;
  readonly hasDebt: boolean;
  readonly pendingApproval: boolean;
}

export interface OrderListResult {
  readonly items: readonly Order[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrderCapabilities {
  readonly canViewAll: boolean;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canEditOwn: boolean;
  readonly canDuplicate: boolean;
  readonly canApprove: boolean;
  readonly canCancel: boolean;
  readonly canPrepare: boolean;
  readonly canDispatch: boolean;
  readonly canSyncTango: boolean;
  readonly canViewPreparedOnly: boolean;
}

export interface OrderCreateResult {
  readonly order: Order;
  readonly detail: OrderDetailData;
}

export interface OrderLookupResult {
  readonly order: Order;
  readonly detail: OrderDetailData;
}

export interface OrderItemTotalsInput {
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: number;
  readonly discountAmount?: number;
}
