import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useTangoMappings } from "../hooks";

export function TangoMappingsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Tango mapeos`);
  const { data, loading, error } = useTangoMappings();

  return (
    <ContentLayout>
      <PageHeader title="Mapeos Tango" description="Relación entre entidades internas y códigos externos simulados." />
      {loading && <EmptyState title="Cargando mapeos..." description="Se está obteniendo la grilla de correspondencias." />}
      {error && <EmptyState title="No se pudo cargar la información" description={error} />}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((mapping) => (
            <Card key={mapping.id}>
              <CardHeader>
                <CardTitle>{mapping.displayLabel}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p>Entidad: {mapping.entityType}</p>
                <p>Estado: {mapping.status}</p>
                <p>Última sincronización: {mapping.lastSyncedAt ?? "Pendiente"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ContentLayout>
  );
}
