import type { BranchId, CompanyId, TangoSyncJobId } from "@/domain/shared";
import type { SafeJsonValue } from "@/domain/shared/types";
import type { ISODateString } from "@/types/identity";

export type TangoOperation =
  | "sendOrder"
  | "syncProducts"
  | "syncClients"
  | "syncPriceLists"
  | "syncStock"
  | "syncAccounts"
  | "syncDebts"
  | "receiveInvoice"
  | "checkOrderStatus"
  | "healthCheck";

export type TangoEntityType = "order" | "product" | "client" | "priceList" | "stock" | "debt" | "invoice";
export type TangoSyncJobStatus = "pending" | "processing" | "success" | "failed" | "retrying" | "cancelled" | "blocked" | "notConfigured";
export type TangoProvider = "mock" | "api" | "webService" | "sdk" | "file" | "localConnector" | "disabled";
export type TangoConflictResolutionStrategy = "tangoWins" | "erpWins" | "manualReview" | "merge";
export type TangoIntegrationFailureType =
  | "configuration"
  | "authentication"
  | "authorization"
  | "connection"
  | "timeout"
  | "validation"
  | "mapping"
  | "duplicate"
  | "externalSystem"
  | "unsupportedOperation"
  | "unknown";

export interface TangoCapabilities {
  readonly readProducts: boolean;
  readonly writeProducts: boolean;
  readonly readClients: boolean;
  readonly writeClients: boolean;
  readonly readPrices: boolean;
  readonly readStock: boolean;
  readonly readAccounts: boolean;
  readonly readDebts: boolean;
  readonly writeOrders: boolean;
  readonly readOrders: boolean;
  readonly readInvoices: boolean;
  readonly webhooks: boolean;
  readonly polling: boolean;
  readonly batchImport: boolean;
  readonly realTimeSync: boolean;
}

export interface TangoSyncJobRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly backoffFactor: number;
  readonly retryableErrors: readonly TangoIntegrationFailureType[];
}

export interface TangoSyncJob {
  readonly id: TangoSyncJobId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly entityType: TangoEntityType;
  readonly entityId: string;
  readonly provider: TangoProvider;
  readonly operation: TangoOperation;
  readonly status: TangoSyncJobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly scheduledAt: ISODateString;
  readonly startedAt?: ISODateString;
  readonly lastError?: string;
  readonly externalReference?: string;
  readonly requestPayload?: SafeJsonValue;
  readonly responsePayload?: SafeJsonValue;
  readonly idempotencyKey: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly processedAt?: ISODateString;
  readonly nextRetryAt?: ISODateString;
}

export interface TangoSyncJobLog {
  readonly jobId: TangoSyncJobId;
  readonly message: string;
  readonly status: TangoSyncJobStatus;
  readonly createdAt: ISODateString;
}
