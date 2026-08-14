import type { TangoSyncJobId } from "@/domain/shared";
import type {
  TangoDiagnosticsState,
  TangoIntegrationJobFilter,
  TangoIntegrationOverview,
  TangoIntegrationSettings,
  TangoMappingRecord,
  TangoSyncJob,
  TangoSyncSummary,
} from "../types";
import type { BranchId, CompanyId } from "@/domain/shared";
import { getTangoProviderLabel } from "../utils";
import { createIdempotencyKey } from "../utils/idempotency";
import type { TangoIntegrationRepository } from "./tango-integration-repository";

function asJobId(value: string): TangoSyncJobId {
  return value as TangoSyncJobId;
}

function asCompanyId(value: string): CompanyId {
  return value as CompanyId;
}

function asBranchId(value: string): BranchId {
  return value as BranchId;
}

function createJob(seed: Omit<TangoSyncJob, "id"> & { readonly id: string }): TangoSyncJob {
  return { ...seed, id: asJobId(seed.id) };
}

function buildSummary(jobs: readonly TangoSyncJob[]): TangoSyncSummary {
  const summary = { pending: 0, processing: 0, success: 0, failed: 0, retrying: 0, cancelled: 0, blocked: 0, notConfigured: 0 } satisfies TangoSyncSummary;

  for (const job of jobs) {
    summary[job.status] += 1;
  }

  return summary;
}

function buildChecks(diagnostics: TangoDiagnosticsState): TangoDiagnosticsState["checks"] {
  return [
    { id: "provider", label: "Proveedor", value: getTangoProviderLabel(diagnostics.provider), tone: diagnostics.configured ? "success" : "warning" },
    { id: "connection", label: "Conexión", value: diagnostics.connected ? "Conectado" : "Sin conexión", tone: diagnostics.connected ? "success" : "danger" },
    { id: "pending", label: "Pendientes", value: String(diagnostics.pendingJobs), tone: diagnostics.pendingJobs > 0 ? "warning" : "success" },
    { id: "blocked", label: "Bloqueados", value: String(diagnostics.blockedJobs), tone: diagnostics.blockedJobs > 0 ? "danger" : "muted" },
  ];
}

const NOW = "2026-07-11T12:00:00.000Z";

const INITIAL_JOBS: readonly TangoSyncJob[] = [
  createJob({
    id: "tango-job-1001",
    companyId: asCompanyId("company-cba"),
    branchId: asBranchId("branch-central"),
    entityType: "product",
    entityId: "product-0013",
    provider: "mock",
    operation: "syncProducts",
    status: "success",
    attempts: 1,
    maxAttempts: 3,
    scheduledAt: NOW,
    startedAt: NOW,
    processedAt: NOW,
    idempotencyKey: createIdempotencyKey("company-cba", "syncProducts", "product-0013"),
    createdAt: NOW,
    updatedAt: NOW,
    externalReference: "TNG-PROD-0013",
    responsePayload: { externalCode: "TNG-PROD-0013" },
  }),
  createJob({
    id: "tango-job-1002",
    companyId: asCompanyId("company-cba"),
    branchId: asBranchId("branch-central"),
    entityType: "order",
    entityId: "order-0021",
    provider: "mock",
    operation: "sendOrder",
    status: "retrying",
    attempts: 2,
    maxAttempts: 4,
    scheduledAt: NOW,
    startedAt: NOW,
    nextRetryAt: NOW,
    idempotencyKey: createIdempotencyKey("company-cba", "sendOrder", "order-0021"),
    createdAt: NOW,
    updatedAt: NOW,
    lastError: "Tango demoró demasiado en responder.",
    requestPayload: { number: "ORD-0021", total: 0 },
  }),
  createJob({
    id: "tango-job-1003",
    companyId: asCompanyId("company-cba"),
    branchId: asBranchId("branch-norte"),
    entityType: "client",
    entityId: "client-0008",
    provider: "mock",
    operation: "syncClients",
    status: "blocked",
    attempts: 3,
    maxAttempts: 3,
    scheduledAt: NOW,
    startedAt: NOW,
    idempotencyKey: createIdempotencyKey("company-cba", "syncClients", "client-0008"),
    createdAt: NOW,
    updatedAt: NOW,
    lastError: "El cliente requiere revisión manual del mapeo.",
  }),
];

const INITIAL_MAPPINGS: readonly TangoMappingRecord[] = [
  {
    id: "mapping-product-0013",
    companyId: asCompanyId("company-cba"),
    provider: "mock",
    entityType: "product",
    internalEntityId: "product-0013",
    internalCode: "INT-0013",
    externalCode: "TNG-0013",
    status: "mapped",
    lastSyncedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "mapping-client-0008",
    companyId: asCompanyId("company-cba"),
    provider: "mock",
    entityType: "client",
    internalEntityId: "client-0008",
    internalCode: "CLI-0008",
    externalCode: "TNG-CLI-008",
    status: "conflict",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const INITIAL_SETTINGS: TangoIntegrationSettings = {
  enabled: true,
  provider: "mock",
  conflictResolutionStrategy: "manualReview",
  retryPolicy: {
    maxAttempts: 4,
    baseDelayMs: 30_000,
    backoffFactor: 2,
    retryableErrors: ["connection", "timeout", "externalSystem"],
  },
  idempotencyPrefix: "cba-tango",
  maxConcurrentJobs: 3,
  lastUpdatedAt: NOW,
  notes: "Configuración simulada para validar la arquitectura de sincronización.",
};

export class MockTangoIntegrationRepository implements TangoIntegrationRepository {
  private readonly jobs: TangoSyncJob[] = [...INITIAL_JOBS];
  private readonly mappings: TangoMappingRecord[] = [...INITIAL_MAPPINGS];
  private settings: TangoIntegrationSettings = INITIAL_SETTINGS;

  async listJobs(filter?: TangoIntegrationJobFilter): Promise<readonly TangoSyncJob[]> {
    await Promise.resolve();
    return this.jobs
      .filter((job) => filter?.status === undefined || job.status === filter.status)
      .filter((job) => filter?.entityType === undefined || job.entityType === filter.entityType)
      .filter((job) => filter?.provider === undefined || job.provider === filter.provider)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getJob(jobId: TangoSyncJobId): Promise<TangoSyncJob | null> {
    await Promise.resolve();
    return this.jobs.find((job) => job.id === jobId) ?? null;
  }

  async saveJob(job: TangoSyncJob): Promise<TangoSyncJob> {
    await Promise.resolve();
    const index = this.jobs.findIndex((current) => current.id === job.id);
    if (index >= 0) {
      this.jobs[index] = job;
    } else {
      this.jobs.unshift(job);
    }

    return job;
  }

  async listMappings(): Promise<readonly TangoMappingRecord[]> {
    await Promise.resolve();
    return [...this.mappings];
  }

  async getDiagnostics(): Promise<TangoDiagnosticsState> {
    const jobs = await this.listJobs();
    const summary = buildSummary(jobs);
    const diagnostics: TangoDiagnosticsState = {
      provider: this.settings.provider,
      configured: this.settings.enabled,
      connected: this.settings.enabled,
      capabilities: {
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
      },
      lastError: jobs.find((job) => job.lastError !== undefined)?.lastError ?? null,
      lastCheckedAt: NOW,
      lastSyncAt: jobs.find((job) => job.processedAt !== undefined)?.processedAt ?? null,
      pendingJobs: summary.pending + summary.processing + summary.retrying,
      blockedJobs: summary.blocked,
      failedJobs: summary.failed,
      productsWithoutMapping: 4,
      clientsWithoutMapping: 2,
      checks: [],
    };

    return { ...diagnostics, checks: buildChecks(diagnostics) };
  }

  async getSettings(): Promise<TangoIntegrationSettings> {
    await Promise.resolve();
    return this.settings;
  }

  async updateSettings(patch: Partial<TangoIntegrationSettings>): Promise<TangoIntegrationSettings> {
    await Promise.resolve();
    this.settings = {
      ...this.settings,
      ...patch,
      lastUpdatedAt: NOW,
      retryPolicy: patch.retryPolicy ?? this.settings.retryPolicy,
    };

    return this.settings;
  }

  async getSummary(): Promise<TangoSyncSummary> {
    await Promise.resolve();
    return buildSummary(this.jobs);
  }

  async getOverview(): Promise<TangoIntegrationOverview> {
    const [jobs, mappings, diagnostics, settings, summary] = await Promise.all([
      this.listJobs(),
      this.listMappings(),
      this.getDiagnostics(),
      this.getSettings(),
      this.getSummary(),
    ]);

    return {
      systemInformation: {
        provider: settings.provider,
        version: "mock-1.0",
        instanceLabel: "Tango simulado",
        connected: settings.enabled,
        lastCheckedAt: diagnostics.lastCheckedAt,
        lastSyncAt: diagnostics.lastSyncAt,
      },
      summary,
      settings,
      recentJobs: jobs.slice(0, 5),
      mappings,
      diagnostics,
    };
  }
}
