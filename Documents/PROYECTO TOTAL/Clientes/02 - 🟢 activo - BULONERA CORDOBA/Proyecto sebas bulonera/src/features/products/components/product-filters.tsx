import { Button } from "@/components/ui/button";
import type { ProductListFilters, ProductReferenceData } from "../types";

const selectClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function ProductFilters({
  filters,
  referenceData,
  onChange,
  onReset,
}: {
  readonly filters: ProductListFilters;
  readonly referenceData: ProductReferenceData;
  readonly onChange: (next: ProductListFilters) => void;
  readonly onReset: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-6">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
        <select className={selectClassName} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as ProductListFilters["status"] })}>
          <option value="all">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="blocked">Bloqueado</option>
          <option value="archived">Archivado</option>
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Familia</span>
        <select className={selectClassName} value={filters.familyId} onChange={(event) => onChange({ ...filters, familyId: event.target.value as ProductListFilters["familyId"] })}>
          <option value="all">Todas</option>
          {referenceData.familyOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Línea</span>
        <select className={selectClassName} value={filters.lineId} onChange={(event) => onChange({ ...filters, lineId: event.target.value as ProductListFilters["lineId"] })}>
          <option value="all">Todas</option>
          {referenceData.lineOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Stock</span>
        <select className={selectClassName} value={filters.stockView} onChange={(event) => onChange({ ...filters, stockView: event.target.value as ProductListFilters["stockView"] })}>
          <option value="all">Todo</option>
          <option value="inStock">Con stock</option>
          <option value="lowStock">Stock bajo</option>
          <option value="outOfStock">Sin stock</option>
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Rango</span>
        <select className={selectClassName} value={filters.dateRange} onChange={(event) => onChange({ ...filters, dateRange: event.target.value as ProductListFilters["dateRange"] })}>
          <option value="all">Todo</option>
          <option value="currentMonth">Mes actual</option>
          <option value="last30Days">Últimos 30 días</option>
        </select>
      </label>
      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onReset}>Limpiar filtros</Button>
      </div>
    </div>
  );
}

