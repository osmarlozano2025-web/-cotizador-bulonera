import type { OrderId } from "@/domain/shared";
import type {
  LogisticsActionResult,
  LogisticsHistoryEntry,
  LogisticsListQuery,
  LogisticsListResult,
  LogisticsMissingItem,
  LogisticsOrderDetail,
  LogisticsSummaryResult,
} from "../types";

export interface LogisticsRepository {
  getOperationalOrders(query?: LogisticsListQuery): Promise<LogisticsListResult>;
  getOperationalOrderById(orderId: OrderId): Promise<LogisticsOrderDetail | null>;
  startOrderPreparation(orderId: OrderId): Promise<LogisticsActionResult>;
  updatePreparedQuantity(orderId: OrderId, itemId: string, preparedQuantity: number): Promise<LogisticsActionResult>;
  registerMissingItem(orderId: OrderId, input: Omit<LogisticsMissingItem, "id" | "reportedAt">): Promise<LogisticsActionResult>;
  completeOrderPreparation(orderId: OrderId): Promise<LogisticsActionResult>;
  markOrderReadyForDispatch(orderId: OrderId): Promise<LogisticsActionResult>;
  getLogisticsSummary(): Promise<LogisticsSummaryResult>;
  getLogisticsHistory(orderId?: OrderId): Promise<readonly LogisticsHistoryEntry[]>;
}

