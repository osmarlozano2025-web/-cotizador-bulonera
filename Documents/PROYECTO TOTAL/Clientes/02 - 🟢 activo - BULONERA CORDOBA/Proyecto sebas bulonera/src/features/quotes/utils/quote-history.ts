import type { ClientId, SellerId } from "@/domain/shared";
import type { Quote, QuoteItem } from "@/domain/quote/quote";
import type { QuoteDetailData, QuoteHistoryEntry } from "../types";
import { getQuoteStatusLabel } from "../utils/quote-labels";

export interface QuoteHistoryLabelResolvers {
  readonly getClientLabel: (clientId: ClientId) => string;
  readonly getSellerLabel: (sellerId?: SellerId) => string | undefined;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

function createHistoryEntry(quoteNumber: string, suffix: string, date: string, title: string, description: string, status?: Quote["status"]): QuoteHistoryEntry {
  return {
    id: `${quoteNumber}-${suffix}-${date}`,
    date,
    title,
    description,
    ...(status !== undefined ? { status } : {}),
  };
}

function compareItemCollections(previousItems: readonly QuoteItem[], nextItems: readonly QuoteItem[], quoteNumber: string, changeDate: string): QuoteHistoryEntry[] {
  const previousByProductId = new Map(previousItems.map((item) => [item.productId, item] as const));
  const nextByProductId = new Map(nextItems.map((item) => [item.productId, item] as const));
  const entries: QuoteHistoryEntry[] = [];

  for (const [productId, nextItem] of nextByProductId) {
    const previousItem = previousByProductId.get(productId);
    if (previousItem === undefined) {
      entries.push(createHistoryEntry(
        quoteNumber,
        `item-added-${productId}`,
        changeDate,
        "Producto agregado",
        `${nextItem.description} se agregó a la cotización.`,
      ));
      continue;
    }

    if (previousItem.quantity !== nextItem.quantity) {
      entries.push(createHistoryEntry(
        quoteNumber,
        `item-quantity-${productId}`,
        changeDate,
        "Cantidad modificada",
        `${nextItem.description}: ${previousItem.quantity} → ${nextItem.quantity}.`,
      ));
    }

    if (previousItem.unitPrice !== nextItem.unitPrice) {
      entries.push(createHistoryEntry(
        quoteNumber,
        `item-price-${productId}`,
        changeDate,
        "Precio modificado",
        `${nextItem.description}: ${previousItem.unitPrice} → ${nextItem.unitPrice}.`,
      ));
    }

    if (previousItem.discountPercentage !== nextItem.discountPercentage) {
      entries.push(createHistoryEntry(
        quoteNumber,
        `item-discount-${productId}`,
        changeDate,
        "Descuento modificado",
        `${nextItem.description}: ${previousItem.discountPercentage}% → ${nextItem.discountPercentage}%.`,
      ));
    }
  }

  for (const [productId, previousItem] of previousByProductId) {
    if (!nextByProductId.has(productId)) {
      entries.push(createHistoryEntry(
        quoteNumber,
        `item-removed-${productId}`,
        changeDate,
        "Producto eliminado",
        `${previousItem.description} se quitó de la cotización.`,
      ));
    }
  }

  return entries;
}

export function buildQuoteCreationHistory(quote: Quote): readonly QuoteHistoryEntry[] {
  return [
    createHistoryEntry(
      quote.number,
      "created",
      quote.createdAt,
      "Cotización creada",
      "Se generó la cotización simulada.",
      quote.status,
    ),
  ];
}

export function buildQuoteDuplicateHistory(sourceQuote: Quote, duplicatedQuote: Quote): readonly QuoteHistoryEntry[] {
  return [
    createHistoryEntry(
      duplicatedQuote.number,
      "created",
      duplicatedQuote.createdAt,
      "Cotización creada",
      "Se generó la cotización duplicada.",
      duplicatedQuote.status,
    ),
    createHistoryEntry(
      duplicatedQuote.number,
      "duplicated",
      duplicatedQuote.createdAt,
      "Cotización duplicada",
      `Duplicada desde ${sourceQuote.number}.`,
      duplicatedQuote.status,
    ),
  ];
}

export function buildQuoteConversionHistory(quote: Quote): readonly QuoteHistoryEntry[] {
  return [
    createHistoryEntry(
      quote.number,
      "converted",
      quote.updatedAt,
      "Convertida a pedido",
      "Se preparó la conversión a pedido desde la cotización.",
      "converted",
    ),
  ];
}

export function buildQuoteChangeHistory(previousDetail: QuoteDetailData, nextQuote: Quote, resolvers: QuoteHistoryLabelResolvers): readonly QuoteHistoryEntry[] {
  const previousQuote = previousDetail.quote;
  const entries: QuoteHistoryEntry[] = [];
  const changeDate = nextQuote.updatedAt;

  if (previousQuote.clientId !== nextQuote.clientId) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "client-changed",
      changeDate,
      "Cliente cambiado",
      `${previousDetail.clientName} → ${resolvers.getClientLabel(nextQuote.clientId)}.`,
      nextQuote.status,
    ));
  }

  if (previousQuote.sellerId !== nextQuote.sellerId) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "seller-changed",
      changeDate,
      "Vendedor cambiado",
      `${previousDetail.sellerName ?? "Sin vendedor"} → ${resolvers.getSellerLabel(nextQuote.sellerId) ?? "Sin vendedor"}.`,
      nextQuote.status,
    ));
  }

  if (previousQuote.validUntil !== nextQuote.validUntil) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "valid-until-changed",
      changeDate,
      "Vigencia cambiada",
      `${formatDateLabel(previousQuote.validUntil)} → ${formatDateLabel(nextQuote.validUntil)}.`,
      nextQuote.status,
    ));
  }

  if (previousQuote.status !== nextQuote.status) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "status-changed",
      changeDate,
      "Estado cambiado",
      `${getQuoteStatusLabel(previousQuote.status)} → ${getQuoteStatusLabel(nextQuote.status)}.`,
      nextQuote.status,
    ));
  }

  if (previousQuote.commercialConditions !== nextQuote.commercialConditions) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "commercial-conditions-changed",
      changeDate,
      "Condiciones comerciales actualizadas",
      "Se actualizaron las condiciones comerciales.",
      nextQuote.status,
    ));
  }

  if (previousQuote.notes !== nextQuote.notes) {
    entries.push(createHistoryEntry(
      nextQuote.number,
      "notes-changed",
      changeDate,
      "Observaciones actualizadas",
      "Se actualizaron las observaciones de la cotización.",
      nextQuote.status,
    ));
  }

  entries.push(...compareItemCollections(previousQuote.items, nextQuote.items, nextQuote.number, changeDate));

  return entries;
}
