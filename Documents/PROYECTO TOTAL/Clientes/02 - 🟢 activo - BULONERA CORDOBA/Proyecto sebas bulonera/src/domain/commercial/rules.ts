import type { ClientDebt } from "@/domain/client/client";
import type { DiscountRule } from "@/domain/pricing/pricing";
import { DISCOUNT_SCOPE_PRIORITY_WEIGHT } from "@/domain/pricing/pricing";
import type { Percentage } from "@/domain/shared";
import type { SellerId } from "@/domain/shared";

export interface CommercialLineInput {
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage?: Percentage;
  readonly discountAmount?: number;
}

export interface DebtApprovalPolicy {
  readonly blockedClientRequiresApproval: boolean;
  readonly maxDaysPastDueWithoutApproval?: number;
}

export interface MonetaryTotals {
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
}

const SCALE = 100;

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * SCALE) / SCALE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function validateDiscountPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function calculateLineSubtotal(line: CommercialLineInput): number {
  return roundToCents(line.quantity * line.unitPrice);
}

export function calculateLineDiscountAmount(line: CommercialLineInput): number {
  const subtotal = calculateLineSubtotal(line);
  const discountFromAmount = line.discountAmount ?? 0;
  const discountFromPercentage = subtotal * ((line.discountPercentage ?? 0) / 100);
  const discountValue = line.discountAmount !== undefined ? discountFromAmount : discountFromPercentage;

  return roundToCents(clamp(discountValue, 0, subtotal));
}

export function calculateLineTotal(line: CommercialLineInput): number {
  return roundToCents(calculateLineSubtotal(line) - calculateLineDiscountAmount(line));
}

export function calculateSubtotal(lines: readonly CommercialLineInput[]): number {
  return roundToCents(lines.reduce((total, line) => total + calculateLineSubtotal(line), 0));
}

export function calculateDiscountTotal(lines: readonly CommercialLineInput[]): number {
  return roundToCents(lines.reduce((total, line) => total + calculateLineDiscountAmount(line), 0));
}

export function calculateTotal(lines: readonly CommercialLineInput[]): number {
  return roundToCents(lines.reduce((total, line) => total + calculateLineTotal(line), 0));
}

export function calculateTotals(lines: readonly CommercialLineInput[]): MonetaryTotals {
  return {
    subtotal: calculateSubtotal(lines),
    discountTotal: calculateDiscountTotal(lines),
    total: calculateTotal(lines),
  };
}

export function canSellerApplyDiscount(requestedDiscount: Percentage, authorizedLimit: Percentage): boolean {
  return validateDiscountPercentage(requestedDiscount)
    && validateDiscountPercentage(authorizedLimit)
    && requestedDiscount <= authorizedLimit;
}

export function requiresDiscountApproval(requestedDiscount: Percentage, authorizedLimit: Percentage): boolean {
  return !canSellerApplyDiscount(requestedDiscount, authorizedLimit);
}

export function canSellerApproveOwnException(
  requestedBySellerId?: SellerId,
  approverSellerId?: SellerId,
): boolean {
  if (requestedBySellerId === undefined || approverSellerId === undefined) {
    return true;
  }

  return requestedBySellerId !== approverSellerId;
}

export function isCreditLimitExceeded(debt: ClientDebt): boolean {
  return debt.totalDebt.amount > debt.creditLimit.amount;
}

export function requiresDebtApproval(debt: ClientDebt, policy: DebtApprovalPolicy): boolean {
  if (debt.isBlocked && policy.blockedClientRequiresApproval) {
    return true;
  }

  if (
    policy.maxDaysPastDueWithoutApproval !== undefined
    && debt.daysPastDue > policy.maxDaysPastDueWithoutApproval
  ) {
    return true;
  }

  return isCreditLimitExceeded(debt);
}

export function canClientPlaceOrder(debt: ClientDebt, policy: DebtApprovalPolicy): boolean {
  return !requiresDebtApproval(debt, policy);
}

export function sortDiscountRulesByPriority(rules: readonly DiscountRule[]): readonly DiscountRule[] {
  return [...rules].sort((left, right) => {
    const scopePriorityDelta =
      DISCOUNT_SCOPE_PRIORITY_WEIGHT[right.scope] - DISCOUNT_SCOPE_PRIORITY_WEIGHT[left.scope];
    if (scopePriorityDelta !== 0) {
      return scopePriorityDelta;
    }

    const priorityDelta = right.priority - left.priority;
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return 0;
  });
}
