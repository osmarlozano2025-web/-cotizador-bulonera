import type { Quote, QuoteItem } from "@/domain/quote/quote";
import { canConvertQuoteToOrder } from "@/domain/commercial/conversion";
import { calculateTotals, validateDiscountPercentage } from "@/domain/commercial/rules";
import type { ISODateString } from "@/types/identity";
import type { QuoteFormItemValues, QuoteTotalsSummary } from "../types";

const SCALE = 100;
const SELLER_DISCOUNT_LIMIT = 15;

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * SCALE) / SCALE;
}

type QuoteLineInput = Pick<QuoteItem, "quantity" | "unitPrice" | "discountPercentage"> & { readonly discountAmount?: number };

export function calculateQuoteItemSubtotal(item: QuoteLineInput): number {
  return roundToCents(item.quantity * item.unitPrice);
}

export function calculateQuoteItemDiscountAmount(item: QuoteLineInput): number {
  const subtotal = calculateQuoteItemSubtotal(item);
  const amount = item.discountAmount !== undefined && item.discountAmount > 0 ? item.discountAmount : subtotal * (item.discountPercentage / 100);

  return roundToCents(Math.min(Math.max(amount, 0), subtotal));
}

export function calculateQuoteItemTotal(item: QuoteLineInput): number {
  return roundToCents(calculateQuoteItemSubtotal(item) - calculateQuoteItemDiscountAmount(item));
}

export function calculateQuoteTotals(items: readonly QuoteLineInput[]): QuoteTotalsSummary {
  const lines = items.map((item) => ({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercentage: item.discountPercentage,
    ...(item.discountAmount !== undefined ? { discountAmount: item.discountAmount } : {}),
  }));
  const totals = calculateTotals(lines);

  return {
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    itemsCount: items.length,
    unitsCount: items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function mapFormItemsToQuoteItems(items: readonly QuoteFormItemValues[], quoteId: string): readonly QuoteItem[] {
  return items.map((item) => {
    const subtotal = calculateQuoteItemSubtotal(item);
    const discountAmount = subtotal * (item.discountPercentage / 100);
    const lineTotal = roundToCents(subtotal - discountAmount);

    return {
      id: item.id as QuoteItem["id"],
      quoteId: quoteId as QuoteItem["quoteId"],
      productId: item.productId as QuoteItem["productId"],
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
      discountAmount: roundToCents(discountAmount),
      lineTotal,
    };
  });
}

export function getQuoteItemDisplaySummary(item: QuoteLineInput): QuoteTotalsSummary {
  return {
    subtotal: calculateQuoteItemSubtotal(item),
    discountTotal: calculateQuoteItemDiscountAmount(item),
    total: calculateQuoteItemTotal(item),
    itemsCount: 1,
    unitsCount: item.quantity,
  };
}

export function isQuoteExpired(validUntil: ISODateString, now: ISODateString = new Date().toISOString()): boolean {
  return new Date(validUntil).getTime() < new Date(now).getTime();
}

export function isQuoteConvertible(quote: Quote, now: ISODateString = new Date().toISOString()): boolean {
  return canConvertQuoteToOrder(quote, now);
}

export function requiresQuoteAuthorization(quote: Quote): boolean {
  return quote.items.some((item) => item.discountPercentage > SELLER_DISCOUNT_LIMIT)
    || !quote.items.every((item) => validateDiscountPercentage(item.discountPercentage));
}

export function getQuoteDueLabel(validUntil: ISODateString, now: ISODateString = new Date().toISOString()): string {
  const validUntilDate = new Date(validUntil).getTime();
  const currentDate = new Date(now).getTime();
  const deltaDays = Math.ceil((validUntilDate - currentDate) / (1000 * 60 * 60 * 24));

  if (deltaDays < 0) {
    return "Vencida";
  }

  if (deltaDays === 0) {
    return "Vence hoy";
  }

  return `Vence en ${deltaDays} días`;
}
