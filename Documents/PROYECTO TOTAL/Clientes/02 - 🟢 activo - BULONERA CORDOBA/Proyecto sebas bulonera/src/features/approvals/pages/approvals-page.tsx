import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { ApprovalFilters } from "../components/approval-filters";
import { ApprovalHeader } from "../components/approval-header";
import { ApprovalTable } from "../components/approval-table";
import { useApprovals } from "../hooks/use-approvals";

export function ApprovalsPage(): React.JSX.Element {
  const location = useLocation();
  const { filters, setFilters, resetFilters, result, previewRows, loading, error, referenceData, page, pageSize, setPage } = useApprovals();

  return (
    <ContentLayout>
      <ApprovalHeader
        title="Autorizaciones"
        description="Circuito de aprobación comercial, deuda, crédito, excepciones y descuentos sobre datos simulados."
      />

      <ApprovalFilters filters={filters} referenceData={referenceData} onChange={setFilters} onReset={resetFilters} />

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando autorizaciones...</CardContent></Card>}
      {error && <EmptyState title="No se pudieron cargar las autorizaciones" description={error} />}

      {!loading && !error && previewRows.length === 0 && <EmptyState title="No existen autorizaciones." description="Probá ajustando los filtros." />}

      {!loading && !error && previewRows.length > 0 && <ApprovalTable rows={previewRows} search={location.search} />}

      {!loading && !error && result !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Mostrando {result.items.length} de {result.total} autorizaciones</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Anterior</Button>
            <span>Página {page}</span>
            <Button type="button" variant="outline" disabled={page * pageSize >= result.total} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </ContentLayout>
  );
}
