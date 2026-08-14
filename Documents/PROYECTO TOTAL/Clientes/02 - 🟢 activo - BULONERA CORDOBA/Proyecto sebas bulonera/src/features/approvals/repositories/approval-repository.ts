import type { AuthorizationRequest } from "@/domain/approval/approval";
import type { AuthorizationRequestId, ClientId, OrderId, QuoteId, SellerId } from "@/domain/shared";
import type {
  ApprovalActionResult,
  ApprovalCreateInput,
  ApprovalDetailData,
  ApprovalListResult,
  ApprovalLookupResult,
  ApprovalReferenceData,
} from "../types";

export interface ApprovalListQuery {
  readonly filters: {
    readonly search: string;
    readonly status: ApprovalDetailData["request"]["status"] | "all";
    readonly type: ApprovalDetailData["request"]["type"] | "all";
    readonly dateRange: "all" | "currentMonth" | "last30Days";
  };
  readonly page: number;
  readonly pageSize: number;
}

export interface ApprovalRepository {
  getApprovals(query: ApprovalListQuery): Promise<ApprovalListResult>;
  getApprovalById(approvalId: AuthorizationRequestId): Promise<AuthorizationRequest | null>;
  getApprovalDetailData(approvalId: AuthorizationRequestId): Promise<ApprovalDetailData | null>;
  getApprovalLookup(approvalId: AuthorizationRequestId): Promise<ApprovalLookupResult | null>;
  getApprovalByClientId(clientId: ClientId): Promise<ApprovalDetailData | null>;
  createApproval(input: ApprovalCreateInput): Promise<ApprovalActionResult>;
  approveApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult>;
  rejectApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult>;
  cancelApproval(approvalId: AuthorizationRequestId): Promise<ApprovalActionResult>;
  addObservation(approvalId: AuthorizationRequestId, note: string): Promise<ApprovalActionResult>;
  getApprovalByQuoteId(quoteId: QuoteId): Promise<ApprovalDetailData | null>;
  getApprovalByOrderId(orderId: OrderId): Promise<ApprovalDetailData | null>;
  getReferenceData(): ApprovalReferenceData;
}
