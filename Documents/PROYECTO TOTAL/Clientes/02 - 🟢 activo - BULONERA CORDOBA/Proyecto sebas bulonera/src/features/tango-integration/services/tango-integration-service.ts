import type { TangoSyncJobId } from "@/domain/shared";
import { tangoIntegrationService as integrationService } from "@/integrations/tango";
import type { TangoDiagnosticsState, TangoIntegrationOverview, TangoIntegrationSettings, TangoMappingRecord, TangoSyncJob } from "@/integrations/tango";

export const tangoIntegrationService = integrationService;

export function getTangoOverview(): Promise<TangoIntegrationOverview> {
  return tangoIntegrationService.getOverview();
}

export function getTangoJobs(): Promise<readonly TangoSyncJob[]> {
  return tangoIntegrationService.listJobs();
}

export function getTangoJob(jobId: TangoSyncJobId): Promise<TangoSyncJob | null> {
  return tangoIntegrationService.getJob(jobId);
}

export function getTangoMappings(): Promise<readonly TangoMappingRecord[]> {
  return tangoIntegrationService.listMappings();
}

export function getTangoSettings(): Promise<TangoIntegrationSettings> {
  return tangoIntegrationService.getSettings();
}

export function getTangoDiagnostics(): Promise<TangoDiagnosticsState> {
  return tangoIntegrationService.getDiagnostics();
}
