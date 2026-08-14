import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { ProductFilters } from "../components/product-filters";
import { ProductHeader } from "../components/product-header";
import { ProductSearch } from "../components/product-search";
import { ProductTable } from "../components/product-table";
import { useProducts } from "../hooks/use-products";

export function ProductsPage(): React.JSX.Element {
  const { filters, setFilters, resetFilters, result, previewRows, loading, error, capabilities, referenceData, page, pageSize, setPage, sort, setSort } = useProducts();

  return (
    <ContentLayout>
      <ProductHeader
        title="Productos"
        description="Catálogo comercial con listado, filtros, estados, stock, precio y edición simulada sobre datos de referencia."
        actions={capabilities.canCreate ? <Button asChild><Link to="/products/new">Nuevo producto</Link></Button> : undefined}
      />

      <ProductSearch value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} />

      <ProductFilters
        filters={filters}
        referenceData={referenceData}
        onChange={(next) => setFilters(next)}
        onReset={resetFilters}
      />

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando productos...</CardContent></Card>}
      {error && <EmptyState title="No se pudieron cargar los productos" description={error} />}

      {!loading && !error && previewRows.length === 0 && (
        <div className="grid gap-4">
          <EmptyState title="No hay productos para mostrar" description="Probá limpiando filtros o creando un producto nuevo." />
          {capabilities.canCreate && <div className="flex justify-center"><Button asChild><Link to="/products/new">Crear producto</Link></Button></div>}
        </div>
      )}

      {!loading && !error && previewRows.length > 0 && (
        <ProductTable
          rows={previewRows}
          sort={sort}
          onSort={(field) => setSort({ field, direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc" })}
        />
      )}

      {!loading && !error && result !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Mostrando {result.items.length} de {result.total} productos</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Anterior</Button>
            <span>Página {page} de {Math.max(1, Math.ceil(result.total / pageSize))}</span>
            <Button type="button" variant="outline" disabled={page * pageSize >= result.total} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </ContentLayout>
  );
}
