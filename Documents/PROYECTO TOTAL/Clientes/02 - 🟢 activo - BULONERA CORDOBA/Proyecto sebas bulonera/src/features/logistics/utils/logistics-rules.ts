import type { DispatchGuide } from "@/domain/dispatch/dispatch-guide";
import type { Order, OrderStatus } from "@/domain/order/order";
import type { LogisticsMissingItem, LogisticsPreparationItem, PreparationStatus } from "../types";

export function calculatePreparedPercentage(items: readonly LogisticsPreparationItem[]): number {
  const requested = items.reduce((total, item) => total + item.requestedQuantity, 0);
  if (requested <= 0) {
    return 0;
  }

  const prepared = items.reduce((total, item) => total + item.preparedQuantity, 0);
  return Math.round((prepared / requested) * 100);
}

export function calculateMissingQuantity(item: Pick<LogisticsPreparationItem, "requestedQuantity" | "preparedQuantity">): number {
  return Math.max(0, item.requestedQuantity - item.preparedQuantity);
}

export function canStartPreparation(order: Pick<Order, "status">, preparationStatus: PreparationStatus): boolean {
  return order.status === "approved" && preparationStatus === "pending";
}

export function canContinuePreparation(order: Pick<Order, "status">): boolean {
  return order.status === "approved" || order.status === "preparing" || order.status === "prepared" || order.status === "readyForDispatch";
}

export function canCompletePreparation(items: readonly LogisticsPreparationItem[], missingItems: readonly LogisticsMissingItem[], orderStatus: OrderStatus): boolean {
  if (orderStatus === "cancelled" || orderStatus === "dispatched" || orderStatus === "delivered") {
    return false;
  }

  const unresolvedMissing = missingItems.some((item) => item.resolutionStatus === "pending");
  const hasPendingItems = items.some((item) => item.status === "pending");
  return !unresolvedMissing && !hasPendingItems;
}

export function canCreateDispatchGuide(orderStatus: OrderStatus, preparationStatus: PreparationStatus, guide?: DispatchGuide | null): boolean {
  return (orderStatus === "prepared" || orderStatus === "readyForDispatch") && preparationStatus === "prepared" && guide === undefined;
}

export function canDispatchOrder(orderStatus: OrderStatus, guide?: DispatchGuide | null): boolean {
  return (orderStatus === "readyForDispatch" || orderStatus === "prepared" || orderStatus === "dispatched") && guide !== undefined;
}

export function canConfirmDelivery(orderStatus: OrderStatus, guideStatus?: DispatchGuide["status"]): boolean {
  return orderStatus === "dispatched" && guideStatus === "dispatched";
}

export function canRescheduleDelivery(orderStatus: OrderStatus, guideStatus?: DispatchGuide["status"]): boolean {
  return orderStatus === "dispatched" && (guideStatus === "failed" || guideStatus === "rescheduled" || guideStatus === "dispatched");
}

export function validateDispatchGuide(guide: Pick<DispatchGuide, "items" | "deliveryAddressId" | "status">): string[] {
  const issues: string[] = [];

  if (guide.deliveryAddressId === undefined) {
    issues.push("La dirección de entrega es obligatoria.");
  }

  if (guide.items.length === 0) {
    issues.push("La guía debe incluir al menos un ítem.");
  }

  if (guide.status === "pending") {
    issues.push("La guía aún no fue preparada para despacho.");
  }

  return issues;
}

export function validatePreparationCompletion(items: readonly LogisticsPreparationItem[], missingItems: readonly LogisticsMissingItem[]): string[] {
  const issues: string[] = [];

  if (items.length === 0) {
    issues.push("El pedido no contiene productos para preparar.");
  }

  if (items.some((item) => item.preparedQuantity < 0)) {
    issues.push("Las cantidades preparadas no pueden ser negativas.");
  }

  if (items.some((item) => item.preparedQuantity > item.requestedQuantity)) {
    issues.push("La cantidad preparada no puede superar la solicitada.");
  }

  if (items.some((item) => item.status === "pending")) {
    issues.push("Existen ítems pendientes sin resolver.");
  }

  if (missingItems.some((item) => item.resolutionStatus === "pending")) {
    issues.push("Existen faltantes pendientes de resolución.");
  }

  return issues;
}
