import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContentLayout } from "@/components/common/content-layout";
import { DashboardCard } from "@/components/common/dashboard-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionTitle } from "@/components/common/section-title";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useTangoOverview } from "../hooks";

export function TangoIntegrationPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Tango`);
  const { data, loading, error } = useTangoOverview();

  return (
    <ContentLayout>
      <PageHeader
        title="Integración con Tango"
        description="Infraestructura desacoplada, preparada para colas de sincronización, mapeos y diagnóstico."
        actions={<Button variant="outline" asChild><Link to="/integrations/tango/jobs">Ver jobs</Link></Button>}
      />

      {loading && <EmptyState title="Cargando Tango..." description="Se está preparando el estado de integración simulado." />}
      {error && <EmptyState title="No se pudo cargar Tango" description={error} />}

      {data && (
        <>
          <SectionTitle title="Estado general" description="Vista resumida de la integración y sus puntos de control." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard title="Proveedor">
              <p className="text-sm text-muted-foreground">{data.overview.systemInformation.instanceLabel}</p>
            </DashboardCard>
            <DashboardCard title="Pendientes">
              <p className="text-2xl font-semibold">{data.summary.pending + data.summary.processing + data.summary.retrying}</p>
            </DashboardCard>
            <DashboardCard title="Bloqueados">
              <p className="text-2xl font-semibold">{data.overview.diagnostics.blockedJobs}</p>
            </DashboardCard>
            <DashboardCard title="Mapeos">
              <p className="text-2xl font-semibold">{data.overview.mappings.length}</p>
            </DashboardCard>
          </div>
        </>
      )}

      <EmptyState title="Espacio reservado" description="Las vistas operativas vivirán en jobs, mapeos, diagnóstico y settings." />
    </ContentLayout>
  );
}
