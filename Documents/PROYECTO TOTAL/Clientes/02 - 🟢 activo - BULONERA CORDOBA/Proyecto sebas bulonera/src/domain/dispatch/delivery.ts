import type { BranchId, CompanyId, DispatchGuideId, OrderId, UserId } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "rescheduled";

export type DeliveryFailureReason =
  | "clientAbsent"
  | "incorrectAddress"
  | "rejectedDelivery"
  | "vehicleIssue"
  | "damagedGoods"
  | "other";

export interface Delivery {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly orderId: OrderId;
  readonly dispatchGuideId: DispatchGuideId;
  readonly status: DeliveryStatus;
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly proofOfDelivery?: string;
  readonly failureReason?: DeliveryFailureReason;
  readonly rescheduledDate?: ISODateString;
  readonly notes?: string;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
