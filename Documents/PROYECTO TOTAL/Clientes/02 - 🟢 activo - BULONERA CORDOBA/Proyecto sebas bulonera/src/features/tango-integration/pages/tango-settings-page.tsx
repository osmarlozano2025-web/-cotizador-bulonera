import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useTangoSettings } from "../hooks";

export function TangoSettingsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Tango settings`);
  const { data, loading, error } = useTangoSettings();

  return (
    <ContentLayout>
      <PageHeader title="Configuración de Tango" description="Parámetros simulados listos para conexión futura con backend real." />
      {loading && <EmptyState title="Cargando configuración..." description="Se está recuperando el estado actual." />}
      {error && <EmptyState title="No se pudo cargar la configuración" description={error} />}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>{data.statusLabel}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>Proveedor: {data.provider}</p>
            <p>Resolución de conflictos: {data.conflictResolutionStrategy}</p>
            <p>Máximo de intentos: {data.retryPolicy.maxAttempts}</p>
            <p>Concurrencia: {data.maxConcurrentJobs}</p>
            <p>Prefijo de idempotencia: {data.idempotencyPrefix}</p>
            <p>Última actualización: {data.lastUpdatedAt}</p>
            {data.notes && <p className="text-muted-foreground">{data.notes}</p>}
          </CardContent>
        </Card>
      )}
    </ContentLayout>
  );
}
