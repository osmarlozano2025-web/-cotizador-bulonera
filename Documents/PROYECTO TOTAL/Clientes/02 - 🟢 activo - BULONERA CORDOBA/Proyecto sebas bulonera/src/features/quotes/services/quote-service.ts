import type { Quote } from "@/domain/quote/quote";
import type { QuoteId } from "@/domain/shared";
import { buildQuoteConversionPreview, getMockQuoteDetail, getQuoteReferenceData, getQuoteSeedList } from "../data/mock-quotes";
import type { QuoteConversionPreview, QuoteCreateResult, QuoteFormValues, QuoteReferenceData } from "../types";
import { MockQuoteRepository } from "../repositories/mock-quote-repository";

const repository = new MockQuoteRepository(getQuoteSeedList().map((quote) => getMockQuoteDetail(quote)));

export function getQuoteReferenceDataService(): QuoteReferenceData {
  return getQuoteReferenceData();
}

export const getQuotes = repository.getQuotes.bind(repository);
export const getQuoteById = repository.getQuoteById.bind(repository);
export const getQuoteDetailData = repository.getQuoteDetailData.bind(repository);
export const getQuoteLookup = repository.getQuoteLookup.bind(repository);
export const duplicateQuote = repository.duplicateQuote.bind(repository);
export const convertQuote = repository.convertQuote.bind(repository);

export async function submitQuoteForm(values: QuoteFormValues, currentQuoteId?: QuoteId): Promise<QuoteCreateResult> {
  if (currentQuoteId === undefined) {
    return repository.createQuote(values);
  }

  return repository.updateQuote(currentQuoteId, values);
}

export function previewConversion(quote: Quote): QuoteConversionPreview {
  return buildQuoteConversionPreview(quote);
}
