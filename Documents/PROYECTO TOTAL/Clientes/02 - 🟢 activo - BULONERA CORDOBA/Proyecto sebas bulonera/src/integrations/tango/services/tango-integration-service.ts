import { createTangoConnector } from "../clients";
import { MockTangoIntegrationRepository } from "../repositories/mock-tango-integration-repository";
import type { TangoIntegrationJobFilter, TangoIntegrationOverview, TangoIntegrationSettings, TangoMappingRecord, TangoSyncJob } from "../types";
import type { TangoSyncJobId } from "@/domain/shared";

class TangoIntegrationService {
  private readonly connector = createTangoConnector();
  private readonly repository = new MockTangoIntegrationRepository();

  async getOverview(): Promise<TangoIntegrationOverview> {
    return this.repository.getOverview();
  }

  async listJobs(filter?: TangoIntegrationJobFilter): Promise<readonly TangoSyncJob[]> {
    return this.repository.listJobs(filter);
  }

  async getJob(jobId: TangoSyncJobId): Promise<TangoSyncJob | null> {
    return this.repository.getJob(jobId);
  }

  async listMappings(): Promise<readonly TangoMappingRecord[]> {
    return this.repository.listMappings();
  }

  async getSettings(): Promise<TangoIntegrationSettings> {
    return this.repository.getSettings();
  }

  async getDiagnostics() {
    return this.repository.getDiagnostics();
  }

  async refreshSystemInformation(): Promise<TangoIntegrationOverview["systemInformation"]> {
    const result = await this.connector.getSystemInformation();
    if (result.ok && result.data !== undefined) {
      return result.data;
    }

    return (await this.repository.getOverview()).systemInformation;
  }

  async updateSettings(patch: Partial<TangoIntegrationSettings>): Promise<TangoIntegrationSettings> {
    return this.repository.updateSettings(patch);
  }
}

export const tangoIntegrationService = new TangoIntegrationService();
