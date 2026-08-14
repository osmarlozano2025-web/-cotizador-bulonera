import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { TangoStatusBadge } from "../components";
import { useTangoJobs } from "../hooks";

export function TangoSyncJobsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Tango jobs`);
  const { data, loading, error } = useTangoJobs();

  return (
    <ContentLayout>
      <PageHeader title="Jobs de sincronización" description="Cola simulada con trazabilidad, estados y reintentos preparados." />

      {loading && <EmptyState title="Cargando jobs..." description="Se está construyendo la cola simulada." />}
      {error && <EmptyState title="No se pudo cargar la cola" description={error} />}

      {data && (
        <div className="grid gap-4">
          {data.map((job) => (
            <Card key={job.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{job.entityId}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{job.displayLabel}</p>
                </div>
                <TangoStatusBadge status={job.status} />
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Operación: {job.operation}</span>
                <span>·</span>
                <span>Intentos {job.attempts}/{job.maxAttempts}</span>
                <span>·</span>
                <span>Idempotencia {job.idempotencyKey}</span>
                <Button variant="outline" asChild className="ml-auto">
                  <Link to={`/integrations/tango/jobs/${job.id}`}>Detalle</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ContentLayout>
  );
}
