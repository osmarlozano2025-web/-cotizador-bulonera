import type { ISODateString } from "@/types/identity";
import type { PreparedOrderDraft, OrderItemDraft } from "@/domain/order/order";
import type { Quote } from "@/domain/quote/quote";
import { calculateTotals } from "./rules";

function isAcceptedQuote(quote: Quote): boolean {
  return quote.status === "accepted";
}

function isQuoteExpired(quote: Quote, now: ISODateString): boolean {
  return new Date(quote.validUntil).getTime() < new Date(now).getTime();
}

export function canConvertQuoteToOrder(quote: Quote, now: ISODateString): boolean {
  return isAcceptedQuote(quote) && !isQuoteExpired(quote, now);
}

export function prepareOrderDraftFromAcceptedQuote(quote: Quote, now: ISODateString): PreparedOrderDraft | null {
  if (!canConvertQuoteToOrder(quote, now)) {
    return null;
  }

  const items: readonly OrderItemDraft[] = quote.items.map((item) => ({
    sourceQuoteItemId: item.id,
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercentage: item.discountPercentage,
    discountAmount: item.discountAmount,
    lineTotal: item.lineTotal,
  }));

  const totals = calculateTotals(items);

  return {
    companyId: quote.companyId,
    branchId: quote.branchId,
    clientId: quote.clientId,
    sourceQuoteId: quote.id,
    status: "draft",
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    currency: quote.currency,
    paymentCondition: "",
    requiresApproval: false,
    createdBy: quote.createdBy,
    ...(quote.sellerId !== undefined ? { sellerId: quote.sellerId } : {}),
    ...(quote.notes !== undefined ? { notes: quote.notes } : {}),
  };
}
