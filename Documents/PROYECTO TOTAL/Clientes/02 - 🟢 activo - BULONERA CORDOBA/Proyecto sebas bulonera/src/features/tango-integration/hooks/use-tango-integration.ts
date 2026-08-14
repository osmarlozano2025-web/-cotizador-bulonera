import { useCallback, useEffect, useState } from "react";
import type { TangoSyncJobId } from "@/domain/shared";
import { getTangoDiagnostics, getTangoJob, getTangoJobs, getTangoMappings, getTangoOverview, getTangoSettings } from "../services";
import type {
  TangoDiagnosticsView,
  TangoIntegrationNavCard,
  TangoJobView,
  TangoMappingView,
  TangoOverviewView,
  TangoSettingsView,
} from "../types";
import { getTangoProviderLabel } from "@/integrations/tango";

interface AsyncState<TData> {
  readonly data: TData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

function useAsyncResource<TData>(loader: () => Promise<TData>): AsyncState<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loader();
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la información de Tango.");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useTangoOverview(): AsyncState<TangoOverviewView> {
  const loader = useCallback(async () => {
    const overview = await getTangoOverview();
    return { overview, summary: overview.summary };
  }, []);

  return useAsyncResource(loader);
}

export function useTangoJobs(): AsyncState<readonly TangoJobView[]> {
  const loader = useCallback(async () => {
    const jobs = await getTangoJobs();
    return jobs.map((job) => ({
      ...job,
      displayLabel: `${job.operation} · ${getTangoProviderLabel(job.provider)}`,
    }));
  }, []);

  return useAsyncResource(loader);
}

export function useTangoJob(jobId: TangoSyncJobId | undefined): AsyncState<TangoJobView | null> {
  const loader = useCallback(async () => {
    if (jobId === undefined) {
      return null;
    }

    const job = await getTangoJob(jobId);
    return job === null ? null : { ...job, displayLabel: `${job.operation} · ${getTangoProviderLabel(job.provider)}` };
  }, [jobId]);

  return useAsyncResource(loader);
}

export function useTangoMappings(): AsyncState<readonly TangoMappingView[]> {
  const loader = useCallback(async () => {
    const mappings = await getTangoMappings();
    return mappings.map((mapping) => ({
      ...mapping,
      displayLabel: `${mapping.internalCode} → ${mapping.externalCode}`,
    }));
  }, []);

  return useAsyncResource(loader);
}

export function useTangoSettings(): AsyncState<TangoSettingsView> {
  const loader = useCallback(async () => {
    const settings = await getTangoSettings();
    return {
      ...settings,
      statusLabel: settings.enabled ? "Activo" : "Deshabilitado",
    };
  }, []);

  return useAsyncResource(loader);
}

export function useTangoDiagnostics(): AsyncState<TangoDiagnosticsView> {
  const loader = useCallback(async () => {
    const diagnostics = await getTangoDiagnostics();
    return { ...diagnostics, checks: diagnostics.checks };
  }, []);

  return useAsyncResource(loader);
}

export function useTangoNavigationCards(): readonly TangoIntegrationNavCard[] {
  return [
    { title: "Tango", description: "Resumen general de la integración y el estado actual.", path: "/integrations/tango" },
    { title: "Sincronizaciones", description: "Jobs en cola, reintentos y trazabilidad de errores.", path: "/integrations/tango/jobs" },
    { title: "Mapeos", description: "Relación entre códigos internos y externos.", path: "/integrations/tango/mappings" },
    { title: "Diagnóstico", description: "Chequeos técnicos y estado de la conexión.", path: "/integrations/tango/diagnostics" },
    { title: "Configuración", description: "Parámetros preparados para el futuro backend.", path: "/integrations/tango/settings" },
  ];
}
