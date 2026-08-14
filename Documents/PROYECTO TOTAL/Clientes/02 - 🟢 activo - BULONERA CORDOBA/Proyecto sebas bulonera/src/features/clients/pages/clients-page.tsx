import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ClientFilters } from "../components/client-filters";
import { ClientTable } from "../components/client-table";
import { useClients, mutateClientStatus } from "../hooks/use-clients";
import { getClientReferenceData } from "../services/client-service";

export function ClientsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<string | null>(null);
  const { filters, setFilters, resetFilters, page, setPage, pageSize, result, previewRows, loading, error, refresh, capabilities, sort, setSort } = useClients();
  const referenceData = getClientReferenceData();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clientes"
        description="Listado comercial con búsqueda, filtros, alta, edición y consulta de cuenta corriente sobre datos simulados."
        actions={
          capabilities.canCreate ? (
            <Button asChild>
              <Link to="/clients/new">Nuevo cliente</Link>
            </Button>
          ) : undefined
        }
      />

      <ClientFilters
        value={filters}
        branchOptions={referenceData.branchOptions}
        sellerOptions={referenceData.sellerOptions}
        onChange={(next) => setFilters(next)}
        onClear={resetFilters}
      />

      {feedback && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 text-sm text-sky-800">{feedback}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Cargando clientes simulados...</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="grid gap-3 p-6">
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => void refresh()}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      ) : previewRows.length === 0 ? (
        <EmptyState
          title="No hay clientes para mostrar"
          description="Probá ajustar los filtros o crear un nuevo cliente para empezar."
          icon={<span className="text-2xl">👥</span>}
        />
      ) : (
        <ClientTable
          rows={previewRows}
          capabilities={capabilities}
          sort={sort}
          onSort={(field) => {
            setSort({
              field,
              direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
            });
          }}
          onChangeStatus={(clientId, status) => {
            void (async () => {
              await mutateClientStatus(clientId, status);
              setFeedback("Estado actualizado correctamente.");
              await refresh();
            })().catch((changeError) => {
              setFeedback(changeError instanceof Error ? changeError.message : "No se pudo cambiar el estado del cliente.");
            });
          }}
          onOpenAccount={(clientId) => {
            void navigate(`/clients/${clientId}?tab=account`);
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Mostrando {result?.items.length ?? 0} de {result?.total ?? 0} clientes</p>
        <p>
          Página {page} de {Math.max(1, Math.ceil((result?.total ?? 0) / pageSize))}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <Button variant="outline" disabled={(result?.total ?? 0) <= page * pageSize} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
