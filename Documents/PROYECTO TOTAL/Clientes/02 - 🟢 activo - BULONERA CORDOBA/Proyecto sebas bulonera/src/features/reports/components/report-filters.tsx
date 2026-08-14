import { Button } from "@/components/ui/button";
import type { ReportFilters, ReportReferenceData } from "../types";

const selectClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

interface ReportFiltersProps {
  readonly filters: ReportFilters;
  readonly referenceData: ReportReferenceData;
  readonly onChange: (next: ReportFilters) => void;
  readonly onReset: () => void;
}

export function ReportFiltersPanel({ filters, referenceData, onChange, onReset }: ReportFiltersProps): React.JSX.Element {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Fecha desde</span>
        <input
          type="date"
          className={selectClassName}
          value={filters.dateFrom}
          onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Fecha hasta</span>
        <input
          type="date"
          className={selectClassName}
          value={filters.dateTo}
          onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Cliente</span>
        <select className={selectClassName} value={filters.clientId} onChange={(event) => onChange({ ...filters, clientId: event.target.value })}>
          <option value="all">Todos</option>
          {referenceData.clientOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Vendedor</span>
        <select className={selectClassName} value={filters.sellerId} onChange={(event) => onChange({ ...filters, sellerId: event.target.value })}>
          <option value="all">Todos</option>
          {referenceData.sellerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Producto</span>
        <select className={selectClassName} value={filters.productId} onChange={(event) => onChange({ ...filters, productId: event.target.value })}>
          <option value="all">Todos</option>
          {referenceData.productOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Zona</span>
        <select className={selectClassName} value={filters.zoneId} onChange={(event) => onChange({ ...filters, zoneId: event.target.value })}>
          <option value="all">Todas</option>
          {referenceData.zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Repartidor</span>
        <select className={selectClassName} value={filters.driverId} onChange={(event) => onChange({ ...filters, driverId: event.target.value })}>
          <option value="all">Todos</option>
          {referenceData.driverOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
        <select className={selectClassName} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as ReportFilters["status"] })}>
          {referenceData.statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>

      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onReset}>Limpiar filtros</Button>
      </div>
    </div>
  );
}
