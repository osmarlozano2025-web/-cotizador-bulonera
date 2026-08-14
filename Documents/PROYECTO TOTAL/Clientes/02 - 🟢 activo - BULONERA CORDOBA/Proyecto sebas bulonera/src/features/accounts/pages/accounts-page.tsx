import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { AccountFilters } from "../components/account-filters";
import { AccountHeader } from "../components/account-header";
import { AccountTable } from "../components/account-table";
import { useAccounts } from "../hooks/use-accounts";

export function AccountsPage(): React.JSX.Element {
  const { filters, setFilters, resetFilters, result, previewRows, loading, error, referenceData, page, pageSize, setPage } = useAccounts();

  return (
    <ContentLayout>
      <AccountHeader
        title="Cuenta corriente"
        description="Resumen financiero comercial de cada cliente con movimientos simulados y control de deuda."
        actions={
          <Button variant="outline" asChild>
            <Link to="/dashboard">Ir al dashboard</Link>
          </Button>
        }
      />

      <AccountFilters filters={filters} referenceData={referenceData} onChange={setFilters} onReset={resetFilters} />

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando cuentas corrientes...</CardContent></Card>}
      {error && <EmptyState title="No se pudieron cargar las cuentas corrientes" description={error} />}

      {!loading && !error && previewRows.length === 0 && (
        <EmptyState title="No hay cuentas para mostrar" description="Probá ajustando los filtros." />
      )}

      {!loading && !error && previewRows.length > 0 && <AccountTable rows={previewRows} />}

      {!loading && !error && result !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Mostrando {result.items.length} de {result.total} cuentas</span>
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
