import type { AuthorizationRequest, AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";
import type { BranchId, ClientId, CompanyId, OrderId, QuoteId, SellerId, UserId } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type ApprovalDateRangeFilter = "all" | "currentMonth" | "last30Days";

export interface ApprovalListFilters {
  readonly search: string;
  readonly status: AuthorizationRequestStatus | "all";
  readonly type: AuthorizationRequestType | "all";
  readonly dateRange: ApprovalDateRangeFilter;
}

export const DEFAULT_APPROVAL_LIST_FILTERS: ApprovalListFilters = {
  search: "",
  status: "all",
  type: "all",
  dateRange: "all",
} as const;

export const APPROVALS_PAGE_SIZE = 8;

export interface ApprovalHistoryEntry {
  readonly id: string;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: AuthorizationRequestStatus;
}

export interface ApprovalReferenceData {
  readonly typeOptions: readonly { id: AuthorizationRequestType; label: string }[];
  readonly statusOptions: readonly { id: AuthorizationRequestStatus; label: string }[];
  readonly requestedByOptions: readonly { id: UserId; label: string }[];
  readonly assignedToOptions: readonly { id: UserId; label: string }[];
}

export interface ApprovalDetailData {
  readonly request: AuthorizationRequest;
  readonly number: string;
  readonly typeLabel: string;
  readonly statusLabel: string;
  readonly clientName: string;
  readonly sellerName?: string;
  readonly requestedByName: string;
  readonly assignedToName?: string;
  readonly relatedLabel?: string;
  readonly relatedRoute?: string;
  readonly history: readonly ApprovalHistoryEntry[];
  readonly observations: readonly string[];
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly canCancel: boolean;
  readonly canComment: boolean;
}

export interface ApprovalPreviewRow {
  readonly request: AuthorizationRequest;
  readonly number: string;
  readonly typeLabel: string;
  readonly statusLabel: string;
  readonly clientName: string;
  readonly sellerName: string;
  readonly requestedByName: string;
  readonly assignedToName: string;
  readonly relatedLabel: string;
  readonly searchText: string;
}

export interface ApprovalListResult {
  readonly items: readonly AuthorizationRequest[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ApprovalCapabilities {
  readonly canViewAll: boolean;
  readonly canViewOwn: boolean;
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly canCancel: boolean;
  readonly canComment: boolean;
}

export interface ApprovalActionResult {
  readonly request: AuthorizationRequest;
  readonly detail: ApprovalDetailData;
}

export interface ApprovalLookupResult {
  readonly request: AuthorizationRequest;
  readonly detail: ApprovalDetailData;
}

export interface ApprovalRelationSummary {
  readonly id: string;
  readonly number: string;
  readonly status: AuthorizationRequestStatus;
  readonly statusLabel: string;
  readonly typeLabel: string;
  readonly route: string;
}

export interface ApprovalSeedLink {
  readonly quoteId?: QuoteId;
  readonly orderId?: OrderId;
  readonly clientId?: ClientId;
  readonly sellerId?: SellerId;
}

export interface ApprovalCreateInput {
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly clientId: ClientId;
  readonly clientName: string;
  readonly requestedBy: UserId;
  readonly assignedTo: UserId;
  readonly type: AuthorizationRequestType;
  readonly reason: string;
  readonly relatedLabel: string;
  readonly relatedRoute: string;
  readonly sellerId?: SellerId;
}
