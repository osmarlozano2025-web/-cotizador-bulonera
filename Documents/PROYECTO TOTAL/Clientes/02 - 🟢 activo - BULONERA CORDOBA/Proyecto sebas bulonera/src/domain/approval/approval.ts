import type {
  AuthorizationRequestId,
  BranchId,
  ClientId,
  CompanyId,
  OrderId,
  QuoteId,
  SellerId,
  UserId,
} from "@/domain/shared";
import type { SafeJsonValue } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type AuthorizationRequestType =
  | "discountOverride"
  | "clientDebt"
  | "creditLimit"
  | "manualPrice"
  | "blockedClient"
  | "commercialException";

export type AuthorizationRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AuthorizationRequest {
  readonly id: AuthorizationRequestId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly type: AuthorizationRequestType;
  readonly status: AuthorizationRequestStatus;
  readonly requestedBy: UserId;
  readonly assignedTo?: UserId;
  readonly clientId?: ClientId;
  readonly sellerId?: SellerId;
  readonly quoteId?: QuoteId;
  readonly orderId?: OrderId;
  readonly requestedValue?: SafeJsonValue;
  readonly authorizedValue?: SafeJsonValue;
  readonly reason: string;
  readonly resolutionNotes?: string;
  readonly resolvedBy?: UserId;
  readonly resolvedAt?: ISODateString;
  readonly createdAt: ISODateString;
}

export function canApproveAuthorizationRequest(
  request: AuthorizationRequest,
  approverSellerId?: SellerId,
): boolean {
  if (request.sellerId === undefined || approverSellerId === undefined) {
    return true;
  }

  return request.sellerId !== approverSellerId;
}
