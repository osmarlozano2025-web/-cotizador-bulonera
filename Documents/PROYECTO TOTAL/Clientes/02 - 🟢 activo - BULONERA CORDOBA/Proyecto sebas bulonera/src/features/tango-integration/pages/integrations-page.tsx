import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContentLayout } from "@/components/common/content-layout";
import { DashboardCard } from "@/components/common/dashboard-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionTitle } from "@/components/common/section-title";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useTangoNavigationCards } from "../hooks";

export function IntegrationsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Integraciones`);
  const cards = useTangoNavigationCards();

  return (
    <ContentLayout>
      <PageHeader title="Integraciones" description="Punto de entrada para las integraciones técnicas del ERP." />
      <SectionTitle title="Conectores preparados" description="La estructura queda lista para incorporar nuevos sistemas externos sin tocar la UI base." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.path} title={card.title}>
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">{card.description}</p>
              <Button asChild variant="outline" className="w-fit">
                <Link to={card.path}>Abrir</Link>
              </Button>
            </div>
          </DashboardCard>
        ))}
      </div>
      <EmptyState title="Área reservada" description="Aquí podrán convivir otras integraciones futuras además de Tango." />
    </ContentLayout>
  );
}
