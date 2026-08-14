import type {
  ExternalClientPayload,
  ExternalDebtPayload,
  ExternalInvoicePayload,
  ExternalOrderPayload,
  ExternalPriceListPayload,
  ExternalProductPayload,
  ExternalStockPayload,
  TangoIntegrationOverview,
  TangoMappingRecord,
  TangoSyncJob,
  TangoSyncSummary,
} from "../types";

export function mapProductToExternalPayload(input: {
  readonly code: string;
  readonly description: string;
  readonly family: string;
  readonly unitOfMeasure: string;
  readonly price: number;
  readonly stock: number;
  readonly status: string;
  readonly line?: string;
}): ExternalProductPayload {
  return { ...input };
}

export function mapClientToExternalPayload(input: {
  readonly code: string;
  readonly taxId: string;
  readonly legalName: string;
  readonly status: string;
  readonly tradeName?: string;
  readonly paymentCondition?: string;
  readonly sellerCode?: string;
  readonly priceListCode?: string;
  readonly creditLimit?: number;
  readonly debt?: number;
}): ExternalClientPayload {
  return { ...input };
}

export function mapOrderToExternalPayload(input: ExternalOrderPayload): ExternalOrderPayload {
  return input;
}

export function mapStockToExternalPayload(input: ExternalStockPayload): ExternalStockPayload {
  return input;
}

export function mapDebtToExternalPayload(input: ExternalDebtPayload): ExternalDebtPayload {
  return input;
}

export function mapPriceListToExternalPayload(input: ExternalPriceListPayload): ExternalPriceListPayload {
  return input;
}

export function mapInvoiceToExternalPayload(input: ExternalInvoicePayload): ExternalInvoicePayload {
  return input;
}

export function mapMappingRecord(record: TangoMappingRecord): TangoMappingRecord {
  return record;
}

export function mapJob(job: TangoSyncJob): TangoSyncJob {
  return job;
}

export function mapSummary(summary: TangoSyncSummary): TangoSyncSummary {
  return summary;
}

export function mapOverview(overview: TangoIntegrationOverview): TangoIntegrationOverview {
  return overview;
}
