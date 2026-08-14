import type { SafeJsonValue } from "@/domain/shared/types";
import type { BranchId, CompanyId, TangoSyncJobId } from "@/domain/shared";
import type {
  TangoCapabilities,
  TangoConflictResolutionStrategy,
  TangoEntityType,
  TangoIntegrationFailureType,
  TangoOperation,
  TangoProvider,
  TangoSyncJob,
  TangoSyncJobRetryPolicy,
  TangoSyncJobStatus,
} from "@/domain/integrations/tango";
import type { ISODateString } from "@/types/identity";

export type { TangoCapabilities, TangoConflictResolutionStrategy, TangoEntityType, TangoIntegrationFailureType, TangoOperation, TangoProvider, TangoSyncJob, TangoSyncJobRetryPolicy, TangoSyncJobStatus };

export interface TangoSystemInformation {
  readonly provider: TangoProvider;
  readonly version: string;
  readonly instanceLabel: string;
  readonly connected: boolean;
  readonly lastCheckedAt: ISODateString | null;
  readonly lastSyncAt: ISODateString | null;
}

export interface TangoConnectorResult<TData> {
  readonly ok: boolean;
  readonly data?: TData;
  readonly error?: string;
}

export interface ExternalProductPayload {
  readonly code: string;
  readonly description: string;
  readonly family: string;
  readonly line?: string;
  readonly unitOfMeasure: string;
  readonly price: number;
  readonly stock: number;
  readonly status: string;
}

export interface ExternalClientPayload {
  readonly code: string;
  readonly taxId: string;
  readonly legalName: string;
  readonly tradeName?: string;
  readonly paymentCondition?: string;
  readonly sellerCode?: string;
  readonly priceListCode?: string;
  readonly creditLimit?: number;
  readonly debt?: number;
  readonly status: string;
}

export interface ExternalOrderItemPayload {
  readonly productCode: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: number;
  readonly lineTotal: number;
}

export interface ExternalOrderPayload {
  readonly number: string;
  readonly companyCode: string;
  readonly branchCode: string;
  readonly clientCode: string;
  readonly items: readonly ExternalOrderItemPayload[];
  readonly total: number;
  readonly currency: string;
  readonly paymentCondition?: string;
  readonly notes?: string;
}

export interface ExternalPriceListPayload {
  readonly code: string;
  readonly name: string;
  readonly currency: string;
  readonly status: string;
  readonly clientGroup?: string;
  readonly priceFactor?: number;
}

export interface ExternalStockPayload {
  readonly productCode: string;
  readonly quantity: number;
  readonly source: string;
}

export interface ExternalDebtPayload {
  readonly clientCode: string;
  readonly balance: number;
  readonly overdueDebt: number;
  readonly limit: number;
  readonly currency: string;
}

export interface ExternalInvoicePayload {
  readonly invoiceNumber: string;
  readonly invoiceType: string;
  readonly invoiceDate: ISODateString;
  readonly invoiceTotal: number;
  readonly externalReference?: string;
  readonly status: string;
}

export interface TangoSyncJobQueueItem {
  readonly id: TangoSyncJobId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly entityType: TangoEntityType;
  readonly entityId: string;
  readonly operation: TangoOperation;
  readonly provider: TangoProvider;
  readonly status: TangoSyncJobStatus;
  readonly idempotencyKey: string;
  readonly scheduledAt: ISODateString;
  readonly requestPayload?: SafeJsonValue;
}

export interface TangoMappingRecord {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly provider: TangoProvider;
  readonly entityType: TangoEntityType | "priceList" | "seller" | "branch";
  readonly internalEntityId: string;
  readonly internalCode: string;
  readonly externalCode: string;
  readonly status: "mapped" | "unmapped" | "pending" | "conflict" | "review";
  readonly lastSyncedAt?: ISODateString;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TangoSyncSummary {
  readonly pending: number;
  readonly processing: number;
  readonly success: number;
  readonly failed: number;
  readonly retrying: number;
  readonly cancelled: number;
  readonly blocked: number;
  readonly notConfigured: number;
}

export interface TangoIntegrationSettings {
  readonly enabled: boolean;
  readonly provider: TangoProvider;
  readonly conflictResolutionStrategy: TangoConflictResolutionStrategy;
  readonly retryPolicy: TangoSyncJobRetryPolicy;
  readonly idempotencyPrefix: string;
  readonly maxConcurrentJobs: number;
  readonly lastUpdatedAt: ISODateString;
  readonly notes?: string;
}

export interface TangoIntegrationOverview {
  readonly systemInformation: TangoSystemInformation;
  readonly summary: TangoSyncSummary;
  readonly settings: TangoIntegrationSettings;
  readonly recentJobs: readonly TangoSyncJob[];
  readonly mappings: readonly TangoMappingRecord[];
  readonly diagnostics: TangoDiagnosticsState;
}

export interface TangoIntegrationJobFilter {
  readonly status?: TangoSyncJobStatus;
  readonly entityType?: TangoEntityType;
  readonly provider?: TangoProvider;
}

export interface TangoDiagnosticsCheck {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: "success" | "warning" | "danger" | "muted";
}

export interface TangoDiagnosticsState {
  readonly provider: TangoProvider;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly capabilities: TangoCapabilities;
  readonly lastError: string | null;
  readonly lastCheckedAt: ISODateString | null;
  readonly lastSyncAt: ISODateString | null;
  readonly pendingJobs: number;
  readonly blockedJobs: number;
  readonly failedJobs: number;
  readonly productsWithoutMapping: number;
  readonly clientsWithoutMapping: number;
  readonly checks: readonly TangoDiagnosticsCheck[];
}
