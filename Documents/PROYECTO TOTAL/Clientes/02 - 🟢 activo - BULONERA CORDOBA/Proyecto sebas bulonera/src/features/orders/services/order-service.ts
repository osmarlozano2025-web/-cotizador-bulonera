import type { OrderId, QuoteId } from "@/domain/shared";
import { getQuoteDetailData } from "@/features/quotes/services/quote-service";
import { getOrderReferenceData, getOrderSeedList } from "../data/mock-orders";
import { MockOrderRepository } from "../repositories/mock-order-repository";
import type {
  OrderCreateResult,
  OrderFormValues,
  OrderReferenceData,
} from "../types";
import { mapQuoteToOrderFormDefaults } from "../schemas/order-schema";

const repository = new MockOrderRepository(getOrderSeedList());

export function getOrderReferenceDataService(): OrderReferenceData {
  return getOrderReferenceData();
}

export const getOrders = repository.getOrders.bind(repository);
export const getOrderById = repository.getOrderById.bind(repository);
export const getOrderDetailData = repository.getOrderDetailData.bind(repository);
export const getOrderLookup = repository.getOrderLookup.bind(repository);
export const duplicateOrder = repository.duplicateOrder.bind(repository);
export const approveOrder = repository.approveOrder.bind(repository);
export const cancelOrder = repository.cancelOrder.bind(repository);
export const transitionOrderStatus = repository.transitionOrderStatus.bind(repository);
export const syncOrderToTango = repository.syncOrderToTango.bind(repository);
export const getOrderAuthorization = repository.getAuthorization.bind(repository);

export async function submitOrderForm(values: OrderFormValues, currentOrderId?: OrderId, sourceQuoteId?: QuoteId): Promise<OrderCreateResult> {
  if (currentOrderId === undefined) {
    return repository.createOrder(values, sourceQuoteId);
  }

  return repository.updateOrder(currentOrderId, values);
}

export async function getOrderFormDefaultsFromQuote(quoteId: QuoteId): Promise<OrderFormValues | null> {
  const detail = await getQuoteDetailData(quoteId);
  if (detail === null || detail.quote.status !== "accepted") {
    return null;
  }

  return mapQuoteToOrderFormDefaults(detail.quote, getOrderReferenceDataService());
}
