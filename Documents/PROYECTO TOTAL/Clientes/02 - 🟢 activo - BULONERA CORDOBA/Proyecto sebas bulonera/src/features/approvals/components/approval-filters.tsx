import { Button } from "@/components/ui/button";
import type { ApprovalListFilters, ApprovalReferenceData } from "../types";

const selectClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function ApprovalFilters({
  filters,
  referenceData,
  onChange,
  onReset,
}: {
  readonly filters: ApprovalListFilters;
  readonly referenceData: ApprovalReferenceData;
  readonly onChange: (next: ApprovalListFilters) => void;
  readonly onReset: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
        <select className={selectClassName} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as ApprovalListFilters["status"] })}>
          <option value="all">Todos</option>
          {referenceData.statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Tipo</span>
        <select className={selectClassName} value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as ApprovalListFilters["type"] })}>
          <option value="all">Todos</option>
          {referenceData.typeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Rango</span>
        <select className={selectClassName} value={filters.dateRange} onChange={(event) => onChange({ ...filters, dateRange: event.target.value as ApprovalListFilters["dateRange"] })}>
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

