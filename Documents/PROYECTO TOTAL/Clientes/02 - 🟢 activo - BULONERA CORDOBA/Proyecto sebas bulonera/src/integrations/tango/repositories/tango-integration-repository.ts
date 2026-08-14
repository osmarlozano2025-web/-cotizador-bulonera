import type {
  TangoDiagnosticsState,
  TangoIntegrationJobFilter,
  TangoIntegrationOverview,
  TangoIntegrationSettings,
  TangoMappingRecord,
  TangoSyncJob,
  TangoSyncSummary,
} from "../types";
import type { TangoSyncJobId } from "@/domain/shared";

export interface TangoIntegrationRepository {
  listJobs(filter?: TangoIntegrationJobFilter): Promise<readonly TangoSyncJob[]>;
  getJob(jobId: TangoSyncJobId): Promise<TangoSyncJob | null>;
  saveJob(job: TangoSyncJob): Promise<TangoSyncJob>;
  listMappings(): Promise<readonly TangoMappingRecord[]>;
  getDiagnostics(): Promise<TangoDiagnosticsState>;
  getSettings(): Promise<TangoIntegrationSettings>;
  updateSettings(patch: Partial<TangoIntegrationSettings>): Promise<TangoIntegrationSettings>;
  getSummary(): Promise<TangoSyncSummary>;
  getOverview(): Promise<TangoIntegrationOverview>;
}
