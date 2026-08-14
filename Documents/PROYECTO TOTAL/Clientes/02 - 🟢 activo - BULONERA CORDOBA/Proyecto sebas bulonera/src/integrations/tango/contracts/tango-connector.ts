import type {
  ExternalClientPayload,
  ExternalDebtPayload,
  ExternalInvoicePayload,
  ExternalOrderPayload,
  ExternalPriceListPayload,
  ExternalProductPayload,
  ExternalStockPayload,
  TangoCapabilities,
  TangoConnectorResult,
  TangoSystemInformation,
  TangoSyncJobQueueItem,
} from "../types";

export interface TangoConnector {
  checkConnection(): Promise<TangoConnectorResult<boolean>>;
  getSystemInformation(): Promise<TangoConnectorResult<TangoSystemInformation>>;
  getCapabilities(): Promise<TangoConnectorResult<TangoCapabilities>>;
  syncProducts(payloads: readonly ExternalProductPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  syncClients(payloads: readonly ExternalClientPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  syncPriceLists(payloads: readonly ExternalPriceListPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  syncStock(payloads: readonly ExternalStockPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  syncAccounts(payloads: readonly ExternalDebtPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  syncDebts(payloads: readonly ExternalDebtPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>>;
  sendOrder(payload: ExternalOrderPayload): Promise<TangoConnectorResult<TangoSyncJobQueueItem>>;
  getOrderStatus(externalReference: string): Promise<TangoConnectorResult<{ status: string; message?: string }>>;
  getInvoiceInformation(externalReference: string): Promise<TangoConnectorResult<ExternalInvoicePayload | null>>;
  healthCheck(): Promise<TangoConnectorResult<boolean>>;
}
