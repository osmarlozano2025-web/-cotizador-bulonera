import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { appConfig } from "@/config/app";
import { CommercialReportPanel } from "../components/commercial-report-panel";
import { ReportCategoryPanel } from "../components/report-category-panel";
import { ReportFiltersPanel } from "../components/report-filters";
import { ReportMetricGrid } from "../components/report-metric-grid";
import { buildCommercialReportModel } from "../data/commercial-report";
import { buildReportsModel, getReportReferenceData } from "../data/mock-reports";
import type { ReportCategory, ReportFilters } from "../types";
import { DEFAULT_REPORT_FILTERS } from "../types";

const CATEGORY_OPTIONS: readonly { id: ReportCategory; label: string }[] = [
  { id: "commercial", label: "Comercial" },
  { id: "products", label: "Productos" },
  { id: "operations", label: "Operación" },
  { id: "clients", label: "Clientes" },
  { id: "productivity", label: "Productividad" },
] as const;

export function ReportsPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Reportes`);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("commercial");

  const referenceData = useMemo(() => getReportReferenceData(), []);
  const model = useMemo(() => buildReportsModel(filters), [filters]);
  const commercialModel = useMemo(() => buildCommercialReportModel(filters), [filters]);
  const categoryView = model.categories[selectedCategory];

  return (
    <ContentLayout>
      <PageHeader
        title="Reportes"
        description="Análisis comercial, operativo y de gestión del ERP."
      />

      <ReportFiltersPanel
        filters={filters}
        referenceData={referenceData}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_REPORT_FILTERS)}
      />

      <ReportMetricGrid metrics={model.metrics} />

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {CATEGORY_OPTIONS.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={selectedCategory === option.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {selectedCategory === "commercial" ? <CommercialReportPanel model={commercialModel} /> : <ReportCategoryPanel view={categoryView} />}
    </ContentLayout>
  );
}
