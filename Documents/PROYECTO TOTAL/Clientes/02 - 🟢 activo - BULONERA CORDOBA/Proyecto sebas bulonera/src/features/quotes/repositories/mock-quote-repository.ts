import type { Quote } from "@/domain/quote/quote";
import type { QuoteId, SellerId } from "@/domain/shared";
import { MOCK_QUOTE_BRANCH_ID, MOCK_QUOTE_COMPANY_ID, MOCK_QUOTE_USER_ID, buildQuoteConversionPreview, getMockQuoteDetail } from "../data/mock-quotes";
import { getQuoteReferenceData } from "../data/mock-quotes";
import type { QuoteCreateResult, QuoteDetailData, QuoteFormValues, QuoteListQuery, QuoteListResult, QuoteLookupResult } from "../types";
import { calculateQuoteTotals, mapFormItemsToQuoteItems } from "../utils/quote-calculations";
import { getQuoteStatusLabel } from "../utils/quote-labels";
import { buildQuoteChangeHistory, buildQuoteConversionHistory, buildQuoteCreationHistory, buildQuoteDuplicateHistory, type QuoteHistoryLabelResolvers } from "../utils/quote-history";
import type { QuoteRepository } from "./quote-repository";
import { getApprovalByQuoteId } from "@/features/approvals/services/approval-service";
import { canConvertQuoteWithApproval } from "@/features/approvals/utils/approval-rules";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function cloneQuote(quote: Quote): Quote {
  return {
    ...quote,
    items: quote.items.map((item) => ({ ...item })),
  };
}

function cloneDetail(detail: QuoteDetailData): QuoteDetailData {
  return {
    ...detail,
    quote: cloneQuote(detail.quote),
    productNames: [...detail.productNames],
    totals: { ...detail.totals },
    history: detail.history.map((entry) => ({ ...entry })),
    ...(detail.sellerName !== undefined ? { sellerName: detail.sellerName } : {}),
    ...(detail.conversionPreview !== undefined
      ? {
          conversionPreview: {
            ...detail.conversionPreview,
            ...(detail.conversionPreview.preparedOrderDraft !== undefined
              ? {
                  preparedOrderDraft: {
                    ...detail.conversionPreview.preparedOrderDraft,
                    items: detail.conversionPreview.preparedOrderDraft.items.map((item) => ({ ...item })),
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}

const quoteReferenceData = getQuoteReferenceData();

const historyResolvers: QuoteHistoryLabelResolvers = {
  getClientLabel: (clientId) => quoteReferenceData.clientOptions.find((option) => option.id === clientId)?.label ?? "Cliente no encontrado",
  getSellerLabel: (sellerId) => quoteReferenceData.sellerOptions.find((option) => option.id === sellerId)?.label,
};

function toIsoDate(value: string): string {
  const normalized = value.length === 10 ? `${value}T23:59:59.999Z` : value;
  return new Date(normalized).toISOString();
}

function createQuoteNumber(sequence: number): string {
  return `COT-2025-${String(sequence).padStart(4, "0")}`;
}

function createQuoteFromForm(values: QuoteFormValues, sequence: number, currentQuote?: Quote): Quote {
  const now = new Date().toISOString();
  const quoteId = currentQuote?.id ?? (`quote-${sequence}` as QuoteId);
  const items = mapFormItemsToQuoteItems(values.items, quoteId);
  const totals = calculateQuoteTotals(items);
  const sellerId = values.sellerId.trim();

  return {
    id: quoteId,
    companyId: currentQuote?.companyId ?? MOCK_QUOTE_COMPANY_ID,
    branchId: currentQuote?.branchId ?? MOCK_QUOTE_BRANCH_ID,
    clientId: values.clientId as Quote["clientId"],
    ...(sellerId.length > 0 ? { sellerId: sellerId as SellerId } : {}),
    number: currentQuote?.number ?? createQuoteNumber(sequence),
    status: values.status,
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    currency: currentQuote?.currency ?? "ARS",
    validUntil: toIsoDate(values.validUntil),
    ...(values.commercialConditions.trim().length > 0 ? { commercialConditions: values.commercialConditions.trim() } : {}),
    ...(values.notes.trim().length > 0 ? { notes: values.notes.trim() } : {}),
    createdBy: currentQuote?.createdBy ?? MOCK_QUOTE_USER_ID,
    createdAt: currentQuote?.createdAt ?? now,
    updatedAt: now,
  };
}

function buildDuplicateValidUntil(validUntil: string): string {
  const now = new Date();
  const currentValidUntil = new Date(validUntil);
  if (currentValidUntil.getTime() > now.getTime()) {
    return validUntil.slice(0, 10);
  }

  const nextValidUntil = new Date(now);
  nextValidUntil.setUTCDate(nextValidUntil.getUTCDate() + 30);
  return nextValidUntil.toISOString().slice(0, 10);
}

function hasQuoteChanged(previousQuote: Quote, nextQuote: Quote): boolean {
  if (
    previousQuote.clientId !== nextQuote.clientId
    || previousQuote.sellerId !== nextQuote.sellerId
    || previousQuote.status !== nextQuote.status
    || previousQuote.validUntil !== nextQuote.validUntil
    || previousQuote.commercialConditions !== nextQuote.commercialConditions
    || previousQuote.notes !== nextQuote.notes
    || previousQuote.items.length !== nextQuote.items.length
  ) {
    return true;
  }

  return previousQuote.items.some((item, index) => {
    const nextItem = nextQuote.items[index];
    return nextItem === undefined
      || item.productId !== nextItem.productId
      || item.description !== nextItem.description
      || item.quantity !== nextItem.quantity
      || item.unitPrice !== nextItem.unitPrice
      || item.discountPercentage !== nextItem.discountPercentage
      || item.discountAmount !== nextItem.discountAmount
      || item.lineTotal !== nextItem.lineTotal;
  });
}

function matchesSearch(detail: QuoteDetailData, search: string): boolean {
  if (search.length === 0) {
    return true;
  }

  const normalized = search.toLowerCase();
  const searchText = [
    detail.quote.number,
    detail.clientName,
    detail.sellerName ?? "",
    getQuoteStatusLabel(detail.quote.status),
    detail.quote.notes ?? "",
    detail.quote.commercialConditions ?? "",
    ...detail.productNames,
  ]
    .join(" ")
    .toLowerCase();

  return searchText.includes(normalized);
}

function matchesFilters(detail: QuoteDetailData, query: QuoteListQuery): boolean {
  const { filters } = query;
  const statusMatch = filters.status === "all" || detail.quote.status === filters.status;
  const sellerMatch = filters.sellerId === "all" || (filters.sellerId === "unassigned" ? detail.quote.sellerId === undefined : detail.quote.sellerId === filters.sellerId);
  const clientMatch = filters.clientId === "all" || detail.quote.clientId === filters.clientId;
  const currentDate = new Date();
  const createdAt = new Date(detail.quote.createdAt);
  const dateRangeMatch =
    filters.dateRange === "all"
    || (filters.dateRange === "last30Days" && currentDate.getTime() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30)
    || (filters.dateRange === "currentMonth" && createdAt.getUTCMonth() === currentDate.getUTCMonth() && createdAt.getUTCFullYear() === currentDate.getUTCFullYear());
  const quickViewMatch =
    filters.quickView === "all"
    || (filters.quickView === "expired" && detail.quote.status === "expired")
    || (filters.quickView === "accepted" && detail.quote.status === "accepted")
    || (filters.quickView === "pending" && (detail.quote.status === "pendingApproval" || detail.quote.status === "draft" || detail.quote.status === "sent"));

  return statusMatch && sellerMatch && clientMatch && dateRangeMatch && quickViewMatch && matchesSearch(detail, filters.search);
}

export class MockQuoteRepository implements QuoteRepository {
  private readonly records: QuoteDetailData[];
  private sequence: number;

  constructor(initialRecords: readonly QuoteDetailData[]) {
    this.records = initialRecords.map((record) => cloneDetail(record));
    this.sequence = initialRecords.length + 1;
  }

  async getQuotes(query: QuoteListQuery): Promise<QuoteListResult> {
    await delay();
    const filtered = this.records.filter((record) => matchesFilters(record, query));
    const start = (query.page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize).map((record) => cloneQuote(record.quote));

    return {
      items,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getQuoteById(quoteId: QuoteId): Promise<Quote | null> {
    await delay(80);
    const record = this.records.find((item) => item.quote.id === quoteId);
    return record === undefined ? null : cloneQuote(record.quote);
  }

  async getQuoteDetailData(quoteId: QuoteId): Promise<QuoteDetailData | null> {
    await delay(120);
    const record = this.records.find((item) => item.quote.id === quoteId);
    return record === undefined ? null : cloneDetail(record);
  }

  async getQuoteLookup(quoteId: QuoteId): Promise<QuoteLookupResult | null> {
    await delay(80);
    const record = this.records.find((item) => item.quote.id === quoteId);
    return record === undefined ? null : { quote: cloneQuote(record.quote), detail: cloneDetail(record) };
  }

  async createQuote(values: QuoteFormValues): Promise<QuoteCreateResult> {
    await delay();
    const quote = createQuoteFromForm(values, this.sequence);
    this.sequence += 1;
    const detail = getMockQuoteDetail(quote);
    const nextDetail = { ...detail, history: [...buildQuoteCreationHistory(quote)] };
    this.records.unshift(nextDetail);
    return { quote: cloneQuote(quote), detail: cloneDetail(nextDetail) };
  }

  async updateQuote(quoteId: QuoteId, values: QuoteFormValues): Promise<QuoteCreateResult> {
    await delay();
    const recordIndex = this.records.findIndex((item) => item.quote.id === quoteId);
    if (recordIndex === -1) {
      throw new Error("Cotización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Cotización no encontrada.");
    }
    const currentQuote = currentRecord.quote;
    const updatedQuote = createQuoteFromForm(values, this.sequence, currentQuote);
    if (!hasQuoteChanged(currentQuote, updatedQuote)) {
      return { quote: cloneQuote(currentQuote), detail: cloneDetail(currentRecord) };
    }
    const updatedDetail = getMockQuoteDetail(updatedQuote);
    const updateHistory = buildQuoteChangeHistory(currentRecord, updatedQuote, historyResolvers);
    this.records[recordIndex] = {
      ...updatedDetail,
      history: [...currentRecord.history, ...updateHistory],
      ...(currentRecord.conversionPreview !== undefined ? { conversionPreview: currentRecord.conversionPreview } : {}),
    };

    return { quote: cloneQuote(updatedQuote), detail: cloneDetail(this.records[recordIndex]) };
  }

  async duplicateQuote(quoteId: QuoteId): Promise<QuoteCreateResult> {
    await delay();
    const record = this.records.find((item) => item.quote.id === quoteId);
    if (record === undefined) {
      throw new Error("Cotización no encontrada.");
    }

    const duplicatedValidUntil = buildDuplicateValidUntil(record.quote.validUntil);
    const duplicatedQuote = createQuoteFromForm(
      {
        clientId: record.quote.clientId,
        sellerId: record.quote.sellerId?.toString() ?? "",
        status: "draft",
        validUntil: duplicatedValidUntil,
        commercialConditions: record.quote.commercialConditions ?? "",
        notes: record.quote.notes ?? "",
        items: record.quote.items.map((item, index) => ({
          id: `quote-item-${index + 1}`,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
        })),
      },
      this.sequence,
    );
    this.sequence += 1;
    const detail = getMockQuoteDetail(duplicatedQuote);
    const nextDetail = { ...detail, history: [...buildQuoteDuplicateHistory(record.quote, duplicatedQuote)] };
    this.records.unshift(nextDetail);
    return { quote: cloneQuote(duplicatedQuote), detail: cloneDetail(nextDetail) };
  }

  async convertQuote(quoteId: QuoteId): Promise<ReturnType<typeof buildQuoteConversionPreview> | null> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.quote.id === quoteId);
    if (recordIndex === -1) {
      throw new Error("Cotización no encontrada.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Cotización no encontrada.");
    }

    const preview = buildQuoteConversionPreview(currentRecord.quote);
    const approval = await getApprovalByQuoteId(quoteId);
    if (!canConvertQuoteWithApproval(currentRecord.quote, approval?.request.status ?? null) || !preview.canConvert) {
      return null;
    }
    const convertedQuote: Quote = {
      ...currentRecord.quote,
      status: "converted",
      updatedAt: new Date().toISOString(),
    };
    const convertedDetail = getMockQuoteDetail(convertedQuote);
    this.records[recordIndex] = {
      ...convertedDetail,
      history: [...currentRecord.history, ...buildQuoteConversionHistory(convertedQuote)],
      conversionPreview: preview,
    };

    return preview;
  }
}
