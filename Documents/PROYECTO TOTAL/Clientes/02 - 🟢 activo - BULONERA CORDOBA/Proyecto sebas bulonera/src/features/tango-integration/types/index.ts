import type {
  TangoDiagnosticsCheck,
  TangoDiagnosticsState,
  TangoIntegrationOverview,
  TangoIntegrationSettings,
  TangoMappingRecord,
  TangoSyncJob,
  TangoSyncSummary,
} from "@/integrations/tango";

export interface TangoIntegrationNavCard {
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

export interface TangoIntegrationSection {
  readonly title: string;
  readonly description: string;
}

export interface TangoJobView extends TangoSyncJob {
  readonly displayLabel: string;
}

export interface TangoMappingView extends TangoMappingRecord {
  readonly displayLabel: string;
}

export interface TangoOverviewView {
  readonly overview: TangoIntegrationOverview;
  readonly summary: TangoSyncSummary;
}

export interface TangoSettingsView extends TangoIntegrationSettings {
  readonly statusLabel: string;
}

export interface TangoDiagnosticsView extends TangoDiagnosticsState {
  readonly checks: readonly TangoDiagnosticsCheck[];
}
