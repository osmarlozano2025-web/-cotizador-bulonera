import type { Client } from "@/domain/client/client";
import type { ClientDebt } from "@/domain/client/client";
import { canClientPlaceOrder, requiresDebtApproval } from "@/domain/commercial/rules";
import { calculateTotals, validateDiscountPercentage } from "@/domain/commercial/rules";
import type { Order } from "@/domain/order/order";
import type { OrderApprovalStatus, OrderAuthorizationReason, OrderAuthorizationSummary, OrderItemTotalsInput, OrderTotalsSummary } from "../types";

const SCALE = 100;
const DISCOUNT_LIMIT = 15;

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * SCALE) / SCALE;
}

export function calculateOrderLineSubtotal(line: OrderItemTotalsInput): number {
  return roundToCents(line.quantity * line.unitPrice);
}

export function calculateOrderLineDiscountAmount(line: OrderItemTotalsInput): number {
  const subtotal = calculateOrderLineSubtotal(line);
  const discountValue = line.discountAmount !== undefined ? line.discountAmount : subtotal * (line.discountPercentage / 100);
  return roundToCents(Math.min(Math.max(discountValue, 0), subtotal));
}

export function calculateOrderLineTotal(line: OrderItemTotalsInput): number {
  return roundToCents(calculateOrderLineSubtotal(line) - calculateOrderLineDiscountAmount(line));
}

export function calculateOrderTotals(items: readonly OrderItemTotalsInput[]): OrderTotalsSummary {
  const totals = calculateTotals(items);
  return {
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    itemsCount: items.length,
    unitsCount: items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function mapOrderLineToTotalsInput(line: Pick<Order["items"][number], "quantity" | "unitPrice" | "discountPercentage" | "discountAmount">): OrderItemTotalsInput {
  return {
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountPercentage: line.discountPercentage,
    discountAmount: line.discountAmount,
  };
}

export function validateOrderDiscount(discountPercentage: number): boolean {
  return validateDiscountPercentage(discountPercentage);
}

export function requiresOrderDiscountApproval(discounts: readonly number[]): boolean {
  return discounts.some((discount) => discount > DISCOUNT_LIMIT);
}

export function evaluateOrderAuthorization(
  client: Client,
  estimatedTotal: number,
  discounts: readonly number[],
): OrderAuthorizationSummary {
  const totalDebt = client.currentDebt.amount + estimatedTotal;
  const creditSnapshot: ClientDebt = {
    clientId: client.id,
    totalDebt: { amount: totalDebt, currency: client.creditLimit.currency },
    overdueDebt: client.overdueDebt,
    creditLimit: client.creditLimit,
    daysPastDue: client.overdueDebt.amount > 0 ? 15 : 0,
    isBlocked: client.status === "blocked" || client.commercialStatus === "blocked",
    lastUpdatedAt: client.updatedAt,
  };

  const requiresDebt = requiresDebtApproval(creditSnapshot, {
    blockedClientRequiresApproval: true,
    maxDaysPastDueWithoutApproval: 0,
  });
  const requiresDiscount = requiresOrderDiscountApproval(discounts);
  const requiresCommercial = client.commercialStatus !== "active";
  const required = requiresDebt || requiresDiscount || requiresCommercial;

  const reasons: OrderAuthorizationReason[] = [];
  if (requiresDebt) {
    reasons.push({ code: "debt", label: "Requiere autorización por deuda o límite de crédito." });
    reasons.push({ code: "creditLimit", label: "Requiere autorización por límite de crédito." });
  }
  if (requiresDiscount) {
    reasons.push({ code: "discount", label: "Requiere autorización por descuento." });
  }
  if (requiresCommercial) {
    reasons.push({ code: "commercial", label: "Requiere autorización por excepción comercial." });
  }

  const uniqueReasons = reasons.filter((reason, index, list) => list.findIndex((item) => item.code === reason.code) === index);
  const status: OrderApprovalStatus = required ? "pending" : "notRequired";

  return {
    required,
    status,
    reasons: uniqueReasons,
    creditSnapshot,
  };
}

export function canClientConfirmOrder(client: Client, estimatedTotal: number): boolean {
  const snapshot: ClientDebt = {
    clientId: client.id,
    totalDebt: { amount: client.currentDebt.amount + estimatedTotal, currency: client.creditLimit.currency },
    overdueDebt: client.overdueDebt,
    creditLimit: client.creditLimit,
    daysPastDue: client.overdueDebt.amount > 0 ? 15 : 0,
    isBlocked: client.status === "blocked" || client.commercialStatus === "blocked",
    lastUpdatedAt: client.updatedAt,
  };

  return canClientPlaceOrder(snapshot, {
    blockedClientRequiresApproval: true,
    maxDaysPastDueWithoutApproval: 0,
  });
}

export function getOrderDueWarning(client: Client, estimatedTotal: number): string | null {
  const authorization = evaluateOrderAuthorization(client, estimatedTotal, []);
  if (!authorization.required) {
    return null;
  }

  return "Pedido pendiente de autorización";
}
