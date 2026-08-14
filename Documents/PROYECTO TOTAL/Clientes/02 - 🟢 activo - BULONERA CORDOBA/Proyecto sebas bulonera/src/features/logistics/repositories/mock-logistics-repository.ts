import type { OrderId } from "@/domain/shared";
import { transitionOrderStatus } from "@/features/orders/services/order-service";
import { getLogisticsHistory, getLogisticsOrderDetail, getLogisticsOrderList, getLogisticsSummary, completePreparation, markReadyForDispatch, registerMissingItem, startPreparation, updatePreparedQuantity } from "../data/mock-logistics";
import type {
  LogisticsActionResult,
  LogisticsHistoryEntry,
  LogisticsListQuery,
  LogisticsListResult,
  LogisticsMissingItem,
  LogisticsOrderDetail,
  LogisticsOrderSummary,
  LogisticsSummaryResult,
} from "../types";
import type { LogisticsRepository } from "./logistics-repository";

const delay = async (milliseconds = 120): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function toSummary(detail: LogisticsOrderDetail): LogisticsOrderSummary {
  return {
    orderId: detail.orderId,
    orderNumber: detail.orderNumber,
    orderDate: detail.orderDate,
    clientId: detail.clientId,
    clientName: detail.clientName,
    tradeName: detail.tradeName,
    locality: detail.locality,
    branchId: detail.branchId,
    sellerName: detail.sellerName,
    productsCount: detail.productsCount,
    unitsCount: detail.unitsCount,
    orderStatus: detail.orderStatus,
    preparationStatus: detail.preparationStatus,
    dispatchStatus: detail.dispatchStatus,
    deliveryStatus: detail.deliveryStatus,
    expectedDate: detail.expectedDate,
    dispatchGuideId: detail.dispatchGuideId,
    dispatchGuideNumber: detail.dispatchGuideNumber,
    driverName: detail.driverName,
    vehicleCode: detail.vehicleCode,
    deliveryZone: detail.deliveryZone,
    hasMissingItems: detail.hasMissingItems,
    pendingAuthorization: detail.pendingAuthorization,
    blockedByCredit: detail.blockedByCredit,
    canStartPreparation: detail.canStartPreparation,
    canContinuePreparation: detail.canContinuePreparation,
    canCreateGuide: detail.canCreateGuide,
    canDispatch: detail.canDispatch,
    canViewGuide: detail.canViewGuide,
  };
}

export class MockLogisticsRepository implements LogisticsRepository {
  async getOperationalOrders(query?: LogisticsListQuery): Promise<LogisticsListResult> {
    await delay();
    const rows = getLogisticsOrderList(query?.filters).map((detail) => toSummary(detail));
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? rows.length;
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);

    return { items, total: rows.length, page, pageSize };
  }

  async getOperationalOrderById(orderId: OrderId): Promise<LogisticsOrderDetail | null> {
    await delay(40);
    return getLogisticsOrderDetail(orderId);
  }

  async startOrderPreparation(orderId: OrderId): Promise<LogisticsActionResult> {
    await delay(60);
    const detail = startPreparation(orderId);
    await transitionOrderStatus(orderId, "preparing");
    return { orderId, detail };
  }

  async updatePreparedQuantity(orderId: OrderId, itemId: string, preparedQuantity: number): Promise<LogisticsActionResult> {
    await delay(60);
    const detail = updatePreparedQuantity(orderId, itemId, preparedQuantity);
    return { orderId, detail };
  }

  async registerMissingItem(orderId: OrderId, input: Omit<LogisticsMissingItem, "id" | "reportedAt">): Promise<LogisticsActionResult> {
    await delay(60);
    const detail = registerMissingItem(orderId, input);
    return { orderId, detail };
  }

  async completeOrderPreparation(orderId: OrderId): Promise<LogisticsActionResult> {
    await delay(60);
    const detail = completePreparation(orderId);
    await transitionOrderStatus(orderId, "prepared");
    return { orderId, detail };
  }

  async markOrderReadyForDispatch(orderId: OrderId): Promise<LogisticsActionResult> {
    await delay(60);
    const detail = markReadyForDispatch(orderId);
    await transitionOrderStatus(orderId, "readyForDispatch");
    return { orderId, detail };
  }

  async getLogisticsSummary(): Promise<LogisticsSummaryResult> {
    await delay(40);
    return { summary: getLogisticsSummary() };
  }

  async getLogisticsHistory(orderId?: OrderId): Promise<readonly LogisticsHistoryEntry[]> {
    await delay(30);
    return getLogisticsHistory(orderId);
  }
}
