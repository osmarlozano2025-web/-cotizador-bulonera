import type { Order } from "@/domain/order/order";
import type { OrderId, QuoteId } from "@/domain/shared";
import type {
  OrderAuthorizationSummary,
  OrderCreateResult,
  OrderDetailData,
  OrderFormValues,
  OrderListQuery,
  OrderListResult,
  OrderLookupResult,
  OrderTangoStatus,
} from "../types";

export interface OrderRepository {
  getOrders(query: OrderListQuery): Promise<OrderListResult>;
  getOrderById(orderId: OrderId): Promise<Order | null>;
  getOrderDetailData(orderId: OrderId): Promise<OrderDetailData | null>;
  getOrderLookup(orderId: OrderId): Promise<OrderLookupResult | null>;
  createOrder(values: OrderFormValues, sourceQuoteId?: QuoteId): Promise<OrderCreateResult>;
  updateOrder(orderId: OrderId, values: OrderFormValues): Promise<OrderCreateResult>;
  duplicateOrder(orderId: OrderId): Promise<OrderCreateResult>;
  approveOrder(orderId: OrderId): Promise<OrderCreateResult>;
  cancelOrder(orderId: OrderId): Promise<OrderCreateResult>;
  transitionOrderStatus(orderId: OrderId, nextStatus: Order["status"]): Promise<OrderCreateResult>;
  syncOrderToTango(orderId: OrderId): Promise<OrderCreateResult>;
  getAuthorization(orderId: OrderId): Promise<OrderAuthorizationSummary | null>;
  getTangoStatus(orderId: OrderId): Promise<OrderTangoStatus | null>;
}
