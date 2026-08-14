import type {
  BranchId,
  ClientAddressId,
  ClientId,
  CompanyId,
  DispatchGuideId,
  DispatchGuideItemId,
  OrderId,
  OrderItemId,
  ProductId,
} from "@/domain/shared";
import type { UnitOfMeasureCode } from "@/domain/product/product";
import type { ISODateString } from "@/types/identity";

export type DispatchGuideStatus =
  | "pending"
  | "assigned"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "failed"
  | "rescheduled"
  | "cancelled";

export interface DispatchGuideItem {
  readonly id: DispatchGuideItemId;
  readonly dispatchGuideId: DispatchGuideId;
  readonly orderItemId?: OrderItemId;
  readonly productId: ProductId;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure?: UnitOfMeasureCode;
}

export interface DispatchGuide {
  readonly id: DispatchGuideId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly orderId: OrderId;
  readonly number: string;
  readonly clientId: ClientId;
  readonly deliveryAddressId: ClientAddressId;
  readonly status: DispatchGuideStatus;
  readonly items: readonly DispatchGuideItem[];
  readonly packageCount?: number;
  readonly totalWeight?: number;
  readonly driverName?: string;
  readonly vehicle?: string;
  readonly scheduledDate?: ISODateString;
  readonly deliveredAt?: ISODateString;
  readonly observations?: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
