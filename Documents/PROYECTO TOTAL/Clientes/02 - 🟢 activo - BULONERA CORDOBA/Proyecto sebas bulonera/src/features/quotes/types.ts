import type { BranchId, ClientId, ProductId, QuoteId, SellerId } from "@/domain/shared";
import type { Quote, QuoteStatus } from "@/domain/quote/quote";
import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import type { PreparedOrderDraft } from "@/domain/order/order";
import type { ISODateString } from "@/types/identity";
import type { Role } from "@/features/auth";

export type QuoteDateRangeFilter = "all" | "currentMonth" | "last30Days";
export type QuoteQuickViewFilter = "all" | "expired" | "accepted" | "pending";

export interface QuoteListFilters {
  readonly search: string;
  readonly status: QuoteStatus | "all";
  readonly sellerId: SellerId | "all" | "unassigned";
  readonly clientId: ClientId | "all";
  readonly dateRange: QuoteDateRangeFilter;
  readonly quickView: QuoteQuickViewFilter;
}

export const DEFAULT_QUOTE_LIST_FILTERS: QuoteListFilters = {
  search: "",
  status: "all",
  sellerId: "all",
  clientId: "all",
  dateRange: "all",
  quickView: "all",
} as const;

export const QUOTES_PAGE_SIZE = 8;

export interface QuoteListQuery {
  readonly filters: QuoteListFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface QuoteListResult {
  readonly items: readonly Quote[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface QuoteProductOption {
  readonly id: ProductId;
  readonly code: string;
  readonly name: string;
  readonly basePrice: number;
  readonly unitLabel: string;
}

export interface QuoteReferenceData {
  readonly clientOptions: readonly { id: ClientId; label: string }[];
  readonly sellerOptions: readonly { id: SellerId; label: string }[];
  readonly productOptions: readonly QuoteProductOption[];
}

export interface QuoteFormItemValues {
  readonly id: string;
  readonly productId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: number;
}

export interface QuoteFormValues {
  readonly clientId: string;
  readonly sellerId: string;
  readonly status: QuoteStatus;
  readonly validUntil: ISODateString;
  readonly commercialConditions: string;
  readonly notes: string;
  readonly items: QuoteFormItemValues[];
}

export interface QuoteFormDefaults extends QuoteFormValues {
  readonly currentQuoteId?: QuoteId;
}

export interface QuoteFormSubmitInput {
  readonly formValues: QuoteFormValues;
  readonly currentQuoteId?: QuoteId;
}

export interface QuoteTotalsSummary {
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly itemsCount: number;
  readonly unitsCount: number;
}

export interface QuoteHistoryEntry {
  readonly id: string;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: QuoteStatus;
}

export interface QuoteConversionPreview {
  readonly canConvert: boolean;
  readonly message: string;
  readonly convertedAt?: ISODateString;
  readonly preparedOrderDraft?: PreparedOrderDraft;
}

export interface QuoteDetailData {
  readonly quote: Quote;
  readonly clientName: string;
  readonly sellerName?: string;
  readonly productNames: readonly string[];
  readonly totals: QuoteTotalsSummary;
  readonly history: readonly QuoteHistoryEntry[];
  readonly authorizationRequired: boolean;
  readonly conversionPreview?: QuoteConversionPreview;
}

export interface QuotePreviewRow {
  readonly quote: Quote;
  readonly clientName: string;
  readonly sellerName: string;
  readonly productNames: readonly string[];
  readonly searchText: string;
  readonly statusLabel: string;
  readonly dueLabel: string;
  readonly authorizationStatus: AuthorizationRequestStatus | null;
  readonly canConvert: boolean;
}

export interface QuoteCapabilities {
  readonly canViewAll: boolean;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canEditOwn: boolean;
  readonly canDuplicate: boolean;
  readonly canConvert: boolean;
  readonly canRequestAuthorization: boolean;
  readonly canPrint: boolean;
  readonly canDownloadPdf: boolean;
  readonly canManageSettings: boolean;
}

export interface QuoteLookupResult {
  readonly quote: Quote;
  readonly detail: QuoteDetailData;
}

export interface QuoteCreateResult {
  readonly quote: Quote;
  readonly detail: QuoteDetailData;
}

export interface QuoteOptionGroup {
  readonly id: BranchId | ClientId | SellerId | ProductId;
  readonly label: string;
}

export type QuoteRole = Role;
