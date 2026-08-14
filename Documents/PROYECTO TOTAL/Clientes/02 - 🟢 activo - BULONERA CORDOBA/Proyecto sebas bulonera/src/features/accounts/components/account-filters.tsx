import { Button } from "@/components/ui/button";
import type { AccountListFilters, AccountReferenceData } from "../types";

const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function AccountFilters({
  filters,
  referenceData,
  onChange,
  onReset,
}: {
  readonly filters: AccountListFilters;
  readonly referenceData: AccountReferenceData;
  readonly onChange: (next: AccountListFilters) => void;
  readonly onReset: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-1.5 xl:col-span-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Buscar</span>
        <input
          className={inputClassName}
          placeholder="Cliente, código, vendedor o documento"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
        <select className={inputClassName} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as AccountListFilters["status"] })}>
          {referenceData.statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Condición</span>
        <select className={inputClassName} value={filters.creditCondition} onChange={(event) => onChange({ ...filters, creditCondition: event.target.value as AccountListFilters["creditCondition"] })}>
          {referenceData.creditConditionOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onReset}>Limpiar filtros</Button>
      </div>
    </div>
  );
}
