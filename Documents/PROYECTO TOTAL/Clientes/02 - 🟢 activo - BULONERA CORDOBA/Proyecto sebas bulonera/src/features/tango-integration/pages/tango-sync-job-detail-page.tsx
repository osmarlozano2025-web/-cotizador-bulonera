import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import type { TangoSyncJobId } from "@/domain/shared";
import { formatDateTime } from "@/features/clients/utils/formatters";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { TangoStatusBadge } from "../components";
import { useTangoJob } from "../hooks";

export function TangoSyncJobDetailPage(): React.JSX.Element {
  const { jobId: jobIdParam } = useParams();
  const jobId = jobIdParam as TangoSyncJobId | undefined;
  const { data, loading, error } = useTangoJob(jobId);

  useDocumentTitle(`${appConfig.name} · Detalle Tango`);

  return (
    <ContentLayout>
      <PageHeader title="Detalle del job" description="Vista técnica del trabajo de sincronización seleccionado." />
      <Button variant="outline" asChild className="w-fit">
        <Link to="/integrations/tango/jobs">Volver</Link>
      </Button>

      {loading && <EmptyState title="Cargando job..." description="Se está recuperando la información simulada." />}
      {error && <EmptyState title="No se pudo cargar el job" description={error} />}
      {!loading && !error && data === null && <EmptyState title="Job no encontrado" description="El job solicitado no existe en la cola simulada." />}

      {data && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{data.entityId}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{data.displayLabel}</p>
            </div>
            <TangoStatusBadge status={data.status} />
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p><span className="text-muted-foreground">Entidad:</span> {data.entityType}</p>
            <p><span className="text-muted-foreground">Proveedor:</span> {data.provider}</p>
            <p><span className="text-muted-foreground">Creado:</span> {formatDateTime(data.createdAt)}</p>
            <p><span className="text-muted-foreground">Programado:</span> {formatDateTime(data.scheduledAt)}</p>
            <p><span className="text-muted-foreground">Última actualización:</span> {formatDateTime(data.updatedAt)}</p>
            <p><span className="text-muted-foreground">Idempotencia:</span> {data.idempotencyKey}</p>
            {data.lastError && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">{data.lastError}</p>}
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify({ requestPayload: data.requestPayload, responsePayload: data.responsePayload }, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </ContentLayout>
  );
}
