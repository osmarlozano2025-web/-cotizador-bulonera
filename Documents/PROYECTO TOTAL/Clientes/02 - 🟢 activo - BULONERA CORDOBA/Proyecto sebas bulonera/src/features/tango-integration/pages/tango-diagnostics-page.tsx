import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DashboardCard } from "@/components/common/dashboard-card";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { TangoSectionCard } from "../components";
import { useTangoDiagnostics } from "../hooks";

export function TangoDiagnosticsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Tango diagnóstico`);
  const { data, loading, error } = useTangoDiagnostics();

  return (
    <ContentLayout>
      <PageHeader title="Diagnóstico Tango" description="Chequeos técnicos, estados y señales operativas de la integración." />
      {loading && <EmptyState title="Cargando diagnóstico..." description="Se está calculando el estado simulado." />}
      {error && <EmptyState title="No se pudo cargar el diagnóstico" description={error} />}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard title="Conexión"><p className="text-2xl font-semibold">{data.connected ? "OK" : "Sin conexión"}</p></DashboardCard>
            <DashboardCard title="Pendientes"><p className="text-2xl font-semibold">{data.pendingJobs}</p></DashboardCard>
            <DashboardCard title="Bloqueados"><p className="text-2xl font-semibold">{data.blockedJobs}</p></DashboardCard>
            <DashboardCard title="Sin mapeo"><p className="text-2xl font-semibold">{data.productsWithoutMapping + data.clientsWithoutMapping}</p></DashboardCard>
          </div>
          <TangoSectionCard title="Checks" description="Indicadores de salud preparados para la observabilidad futura.">
            <div className="grid gap-3 md:grid-cols-2">
              {data.checks.map((check) => (
                <div key={check.id} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{check.label}</p>
                  <p className="mt-1 font-medium">{check.value}</p>
                  <p className="text-xs text-muted-foreground">{check.tone}</p>
                </div>
              ))}
            </div>
          </TangoSectionCard>
        </>
      )}
    </ContentLayout>
  );
}
