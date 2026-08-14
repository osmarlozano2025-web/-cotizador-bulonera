import type { Quote } from "@/domain/quote/quote";
import type { QuoteId } from "@/domain/shared";
import type {
  QuoteConversionPreview,
  QuoteCreateResult,
  QuoteDetailData,
  QuoteFormValues,
  QuoteListQuery,
  QuoteListResult,
  QuoteLookupResult,
} from "../types";

export interface QuoteRepository {
  getQuotes(query: QuoteListQuery): Promise<QuoteListResult>;
  getQuoteById(quoteId: QuoteId): Promise<Quote | null>;
  getQuoteDetailData(quoteId: QuoteId): Promise<QuoteDetailData | null>;
  createQuote(values: QuoteFormValues): Promise<QuoteCreateResult>;
  updateQuote(quoteId: QuoteId, values: QuoteFormValues): Promise<QuoteCreateResult>;
  duplicateQuote(quoteId: QuoteId): Promise<QuoteCreateResult>;
  convertQuote(quoteId: QuoteId): Promise<QuoteConversionPreview | null>;
  getQuoteLookup(quoteId: QuoteId): Promise<QuoteLookupResult | null>;
}
