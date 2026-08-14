import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { OrderHeader } from "../components/order-header";
import { OrderSearch } from "../components/order-search";
import { OrderFilters } from "../components/order-filters";
import { OrderTable } from "../components/order-table";
import { useDuplicateOrder, useOrders } from "../hooks/use-orders";

export function OrdersPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters, result, previewRows, loading, error, refresh, capabilities, referenceData, page, pageSize, setPage } = useOrders();
  const { duplicateOrder } = useDuplicateOrder();

  return (
    <ContentLayout>
      <OrderHeader
        title="Pedidos"
        description="Circuito comercial completo preparado para creación, aprobación, preparación, despacho y sincronización simulada."
        actions={
          capabilities.canCreate ? (
            <Button asChild>
              <Link to="/orders/new">Nuevo pedido</Link>
            </Button>
          ) : undefined
        }
      />

      <PageHeader
        title="Listado operativo"
        description="Buscá por pedido, cliente, vendedor o producto y filtrá por estado o por etapa del flujo."
      />

      <OrderSearch
        value={filters.search}
        onChange={(value) => {
          setFilters({ ...filters, search: value });
        }}
      />

      <OrderFilters
        filters={filters}
        referenceData={referenceData}
        onChange={(next) => {
          setFilters(next);
        }}
        onReset={resetFilters}
      />

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando pedidos...</CardContent></Card>}
      {error && <EmptyState title="No se pudieron cargar los pedidos" description={error} />}

      {!loading && !error && previewRows.length === 0 && (
        <div className="grid gap-4">
          <EmptyState title="No hay pedidos para mostrar" description="Probá limpiando filtros o creando un nuevo pedido." />
          {capabilities.canCreate && (
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/orders/new">Crear pedido</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && previewRows.length > 0 && (
        <OrderTable
          rows={previewRows}
          onView={(orderId) => {
            void navigate(`/orders/${orderId}`);
          }}
          onEdit={(orderId) => {
            void navigate(`/orders/${orderId}/edit`);
          }}
          onDuplicate={(orderId) => {
            void (async () => {
              const duplicated = await duplicateOrder(orderId);
              void navigate(`/orders/${duplicated.id}`);
              await refresh();
            })().catch(() => undefined);
          }}
        />
      )}

      {!loading && !error && result !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Mostrando {result.items.length} de {result.total} pedidos
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>
              Anterior
            </Button>
            <span>Página {page}</span>
            <Button
              type="button"
              variant="outline"
              disabled={page * pageSize >= result.total}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </ContentLayout>
  );
}

