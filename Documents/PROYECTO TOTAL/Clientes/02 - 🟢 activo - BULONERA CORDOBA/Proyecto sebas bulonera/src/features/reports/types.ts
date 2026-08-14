import type { LucideIcon } from "lucide-react";
import type { SellerId } from "@/domain/shared";
import type { ClientId } from "@/domain/shared";
import type { ProductId } from "@/domain/shared";

export type ReportCategory = "commercial" | "products" | "operations" | "clients" | "productivity";
export type ReportStatusFilter = "all" | "pending" | "active" | "ready" | "dispatched" | "delivered" | "failed" | "cancelled";

export interface ReportFilters {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly clientId: string;
  readonly sellerId: string;
  readonly productId: string;
  readonly zoneId: string;
  readonly driverId: string;
  readonly status: ReportStatusFilter;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  clientId: "all",
  sellerId: "all",
  productId: "all",
  zoneId: "all",
  driverId: "all",
  status: "all",
} as const;

export interface ReportOption {
  readonly id: string;
  readonly label: string;
}

export interface ReportReferenceData {
  readonly clientOptions: readonly ReportOption[];
  readonly sellerOptions: readonly ReportOption[];
  readonly productOptions: readonly ReportOption[];
  readonly zoneOptions: readonly ReportOption[];
  readonly driverOptions: readonly ReportOption[];
  readonly statusOptions: readonly { readonly id: ReportStatusFilter; readonly label: string }[];
}

export interface ReportMetricCard {
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tone: "primary" | "success" | "warning" | "danger" | "muted";
  readonly note?: string;
}

export interface ReportSummaryItem {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly ratio?: number;
}

export interface ReportSummaryBlock {
  readonly title: string;
  readonly description: string;
  readonly items: readonly ReportSummaryItem[];
  readonly emptyMessage: string;
}

export interface ReportCategoryView {
  readonly title: string;
  readonly description: string;
  readonly blocks: readonly ReportSummaryBlock[];
}

export interface ReportsModel {
  readonly metrics: readonly ReportMetricCard[];
  readonly categories: Readonly<Record<ReportCategory, ReportCategoryView>>;
}

export type ReportEntityKind = "order" | "quote" | "guide" | "client" | "product";

export interface ReportEntity {
  readonly kind: ReportEntityKind;
  readonly id: string;
  readonly label: string;
  readonly secondaryLabel?: string;
  readonly date: string;
  readonly status: ReportStatusFilter;
  readonly clientId?: ClientId;
  readonly sellerId?: SellerId;
  readonly productIds?: readonly ProductId[];
  readonly zoneId?: string;
  readonly driverId?: string;
  readonly vehicleId?: string;
  readonly amount?: number;
  readonly quantity?: number;
  readonly deliveryTimeMinutes?: number;
  readonly stockState?: "ok" | "low" | "empty";
}

export type CommercialPeriodGranularity = "day" | "week" | "month";

export interface CommercialSummaryCard {
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tone: "primary" | "success" | "warning" | "danger" | "muted";
  readonly note?: string;
}

export interface CommercialEvolutionPoint {
  readonly label: string;
  readonly ordersCount: number;
  readonly total: number;
  readonly totalLabel: string;
  readonly ratio: number;
}

export interface CommercialClientRankingRow {
  readonly position: number;
  readonly clientId: ClientId;
  readonly clientName: string;
  readonly ordersCount: number;
  readonly total: number;
  readonly totalLabel: string;
  readonly averageTicket: number;
  readonly averageTicketLabel: string;
  readonly lastOperationLabel: string;
  readonly lastOperationDate: string;
  readonly to?: string;
}

export interface CommercialSellerRankingRow {
  readonly position: number;
  readonly sellerId: SellerId;
  readonly sellerName: string;
  readonly ordersCount: number;
  readonly approvedQuotesCount: number;
  readonly total: number;
  readonly totalLabel: string;
  readonly conversionRate: number;
  readonly conversionRateLabel: string;
}

export interface CommercialOperationRow {
  readonly id: string;
  readonly date: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly sellerName: string;
  readonly statusLabel: string;
  readonly total: number;
  readonly totalLabel: string;
  readonly originLabel: string;
  readonly orderTo?: string;
  readonly clientTo?: string;
  readonly quoteTo?: string;
}

export interface CommercialReportModel {
  readonly periodLabel: string;
  readonly granularity: CommercialPeriodGranularity;
  readonly summaryCards: readonly CommercialSummaryCard[];
  readonly evolution: readonly CommercialEvolutionPoint[];
  readonly clientRanking: readonly CommercialClientRankingRow[];
  readonly sellerRanking: readonly CommercialSellerRankingRow[];
  readonly operations: readonly CommercialOperationRow[];
}
