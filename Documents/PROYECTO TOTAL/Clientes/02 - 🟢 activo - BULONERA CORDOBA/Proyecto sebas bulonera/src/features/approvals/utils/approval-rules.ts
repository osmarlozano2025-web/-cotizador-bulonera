import type { AuthorizationRequest, AuthorizationRequestStatus } from "@/domain/approval/approval";
import { canApproveAuthorizationRequest } from "@/domain/approval/approval";
import type { SellerId } from "@/domain/shared";
import type { Quote } from "@/domain/quote/quote";
import type { Order } from "@/domain/order/order";
import { isQuoteConvertible } from "@/features/quotes/utils/quote-calculations";
import { requiresQuoteAuthorization } from "@/features/quotes/utils/quote-calculations";
import type { ApprovalDetailData } from "../types";

export function canResolveApprovalRequest(request: AuthorizationRequest, approverSellerId?: SellerId): boolean {
  if (request.status !== "pending") {
    return false;
  }

  return canApproveAuthorizationRequest(request, approverSellerId);
}

export function canRejectApprovalRequest(request: AuthorizationRequest): boolean {
  return request.status === "pending";
}

export function canCancelApprovalRequest(request: AuthorizationRequest): boolean {
  return request.status === "pending";
}

export function isApprovalResolved(detail?: ApprovalDetailData | null): boolean {
  return detail?.request.status === "approved" || detail?.request.status === "rejected" || detail?.request.status === "cancelled";
}

export function canConvertQuoteWithApproval(quote: Quote, approvalStatus?: AuthorizationRequestStatus | null): boolean {
  if (!isQuoteConvertible(quote)) {
    return false;
  }

  if (requiresQuoteAuthorization(quote)) {
    return approvalStatus === "approved";
  }

  return approvalStatus === undefined || approvalStatus === null || approvalStatus === "approved";
}

export function isOrderApprovalPending(order: Order, approvalStatus?: AuthorizationRequestStatus | null): boolean {
  return order.status !== "cancelled" && approvalStatus === "pending";
}
