import type {
  BranchId,
  ClientAddressId,
  ClientId,
  CompanyId,
  OrderId,
  OrderItemId,
  QuoteId,
  QuoteItemId,
  ProductId,
  SellerId,
  UserId,
} from "@/domain/shared";
import type { Currency, Percentage } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type PaymentCondition = string;
export type OrderStatus =
  | "draft"
  | "pendingApproval"
  | "approved"
  | "preparing"
  | "prepared"
  | "readyForDispatch"
  | "dispatched"
  | "delivered"
  | "sentToTango"
  | "invoiced"
  | "cancelled";

export interface OrderItem {
  readonly id: OrderItemId;
  readonly orderId: OrderId;
  readonly productId: ProductId;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: Percentage;
  readonly discountAmount: number;
  readonly lineTotal: number;
}

export interface OrderItemDraft {
  readonly sourceQuoteItemId?: QuoteItemId;
  readonly productId: ProductId;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: Percentage;
  readonly discountAmount: number;
  readonly lineTotal: number;
}

export interface OrderDraft {
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly clientId: ClientId;
  readonly sellerId?: SellerId;
  readonly sourceQuoteId: QuoteId;
  readonly status: Extract<OrderStatus, "draft">;
  readonly items: readonly OrderItemDraft[];
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly currency: Currency;
  readonly paymentCondition: PaymentCondition;
  readonly deliveryAddressId?: ClientAddressId;
  readonly notes?: string;
  readonly requiresApproval: boolean;
  readonly createdBy: UserId;
}

export type PreparedOrderDraft = OrderDraft;

export interface Order {
  readonly id: OrderId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly clientId: ClientId;
  readonly sellerId?: SellerId;
  readonly sourceQuoteId?: QuoteId;
  readonly number: string;
  readonly status: OrderStatus;
  readonly items: readonly OrderItem[];
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly currency: Currency;
  readonly paymentCondition: PaymentCondition;
  readonly deliveryAddressId?: ClientAddressId;
  readonly notes?: string;
  readonly requiresApproval: boolean;
  readonly createdBy: UserId;
  readonly approvedBy?: UserId;
  readonly approvedAt?: ISODateString;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
