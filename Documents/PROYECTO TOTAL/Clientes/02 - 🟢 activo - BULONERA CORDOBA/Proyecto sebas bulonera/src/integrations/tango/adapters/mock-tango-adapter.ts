import type { TangoConnector } from "../contracts/tango-connector";
import { createIdempotencyKey } from "../utils/idempotency";
import type {
  ExternalClientPayload,
  ExternalDebtPayload,
  ExternalInvoicePayload,
  ExternalOrderPayload,
  ExternalPriceListPayload,
  ExternalProductPayload,
  ExternalStockPayload,
  TangoEntityType,
  TangoCapabilities,
  TangoConnectorResult,
  TangoOperation,
  TangoProvider,
  TangoSystemInformation,
  TangoSyncJobQueueItem,
} from "../types";
import type { BranchId, CompanyId, TangoSyncJobId } from "@/domain/shared";

export type MockTangoScenario =
  | "connected"
  | "validationError"
  | "timeout"
  | "connectionError"
  | "rejected"
  | "notConfigured";

function success<TData>(data: TData): TangoConnectorResult<TData> {
  return { ok: true, data };
}

function failure<TData = never>(message: string): TangoConnectorResult<TData> {
  return { ok: false, error: message };
}

function unavailableMessage(scenario: MockTangoScenario): string | null {
  if (scenario === "notConfigured") {
    return "Tango no está configurado.";
  }

  return null;
}

function buildQueueItem(provider: TangoProvider, operation: TangoOperation, entityType: TangoEntityType, entityId: string): TangoSyncJobQueueItem {
  const now = new Date().toISOString();
  return {
    id: `mock-${operation}-${entityId}` as TangoSyncJobId,
    companyId: "company-cba" as CompanyId,
    branchId: "branch-central" as BranchId,
    entityType,
    entityId,
    operation,
    provider,
    status: "success",
    idempotencyKey: createIdempotencyKey("company-cba", operation, entityId),
    scheduledAt: now,
    requestPayload: null,
  };
}

export class MockTangoAdapter implements TangoConnector {
  public constructor(private readonly scenario: MockTangoScenario = "connected") {}

  async checkConnection(): Promise<TangoConnectorResult<boolean>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    if (this.scenario === "connectionError") {
      return failure("No fue posible conectar con Tango.");
    }

    return success(true);
  }

  async getSystemInformation(): Promise<TangoConnectorResult<TangoSystemInformation>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success({
      provider: "mock",
      version: "mock-1.0",
      instanceLabel: "Tango simulado",
      connected: this.scenario === "connected",
      lastCheckedAt: new Date().toISOString(),
      lastSyncAt: null,
    });
  }

  async getCapabilities(): Promise<TangoConnectorResult<TangoCapabilities>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success({
      readProducts: true,
      writeProducts: false,
      readClients: true,
      writeClients: false,
      readPrices: true,
      readStock: true,
      readAccounts: true,
      readDebts: true,
      writeOrders: true,
      readOrders: true,
      readInvoices: true,
      webhooks: false,
      polling: true,
      batchImport: true,
      realTimeSync: false,
    });
  }

  async syncProducts(payloads: readonly ExternalProductPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    if (this.scenario === "validationError") {
      return failure("Los productos no pasaron la validación.");
    }

    return success(payloads.map((payload) => buildQueueItem("mock", "syncProducts", "product", payload.code)));
  }

  async syncClients(payloads: readonly ExternalClientPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success(payloads.map((payload) => buildQueueItem("mock", "syncClients", "client", payload.code)));
  }

  async syncPriceLists(payloads: readonly ExternalPriceListPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success(payloads.map((_, index) => buildQueueItem("mock", "syncPriceLists", "priceList", `price-list-${index + 1}`)));
  }

  async syncStock(payloads: readonly ExternalStockPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success(payloads.map((payload) => buildQueueItem("mock", "syncStock", "stock", payload.productCode)));
  }

  async syncAccounts(payloads: readonly ExternalDebtPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success(payloads.map((payload) => buildQueueItem("mock", "syncAccounts", "debt", payload.clientCode)));
  }

  async syncDebts(payloads: readonly ExternalDebtPayload[]): Promise<TangoConnectorResult<readonly TangoSyncJobQueueItem[]>> {
    await Promise.resolve();
    return this.syncAccounts(payloads);
  }

  async sendOrder(payload: ExternalOrderPayload): Promise<TangoConnectorResult<TangoSyncJobQueueItem>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    if (this.scenario === "validationError") {
      return failure("El pedido no pudo validarse.");
    }

    if (this.scenario === "timeout") {
      return failure("Tango demoró demasiado en responder.");
    }

    if (this.scenario === "rejected") {
      return failure("Tango rechazó el pedido.");
    }

    return success(buildQueueItem("mock", "sendOrder", "order", payload.number));
  }

  async getOrderStatus(externalReference: string): Promise<TangoConnectorResult<{ status: string; message?: string }>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success({ status: this.scenario === "rejected" ? "rejected" : "sent", message: externalReference });
  }

  async getInvoiceInformation(externalReference: string): Promise<TangoConnectorResult<ExternalInvoicePayload | null>> {
    await Promise.resolve();
    const unavailable = unavailableMessage(this.scenario);
    if (unavailable) {
      return failure(unavailable);
    }

    return success({
      invoiceNumber: `FA-${externalReference}`,
      invoiceType: "A",
      invoiceDate: new Date().toISOString(),
      invoiceTotal: 0,
      externalReference,
      status: "available",
    });
  }

  async healthCheck(): Promise<TangoConnectorResult<boolean>> {
    await Promise.resolve();
    return this.checkConnection();
  }
}
