import type { TangoConnector } from "../contracts/tango-connector";
import type { ExternalInvoicePayload, TangoCapabilities, TangoConnectorResult, TangoSystemInformation, TangoSyncJobQueueItem } from "../types";

function notConfigured<TData>(message = "El adaptador no está configurado."): TangoConnectorResult<TData> {
  return { ok: false, error: message };
}

export class TangoApiAdapter implements TangoConnector {
  checkConnection(): Promise<TangoConnectorResult<boolean>> { return Promise.resolve(notConfigured()); }
  getSystemInformation(): Promise<TangoConnectorResult<TangoSystemInformation>> { return Promise.resolve(notConfigured()); }
  getCapabilities(): Promise<TangoConnectorResult<TangoCapabilities>> { return Promise.resolve(notConfigured()); }
  syncProducts(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  syncClients(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  syncPriceLists(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  syncStock(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  syncAccounts(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  syncDebts(): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> { return Promise.resolve(notConfigured()); }
  sendOrder(): Promise<TangoConnectorResult<TangoSyncJobQueueItem>> { return Promise.resolve(notConfigured()); }
  getOrderStatus(): Promise<TangoConnectorResult<{ status: string }>> { return Promise.resolve(notConfigured()); }
  getInvoiceInformation(): Promise<TangoConnectorResult<ExternalInvoicePayload | null>> { return Promise.resolve(notConfigured()); }
  healthCheck(): Promise<TangoConnectorResult<boolean>> { return Promise.resolve(notConfigured()); }
}

export class TangoWebServiceAdapter extends TangoApiAdapter {}
export class TangoSdkAdapter extends TangoApiAdapter {}
export class TangoFileAdapter extends TangoApiAdapter {}
export class TangoLocalConnectorAdapter extends TangoApiAdapter {}
