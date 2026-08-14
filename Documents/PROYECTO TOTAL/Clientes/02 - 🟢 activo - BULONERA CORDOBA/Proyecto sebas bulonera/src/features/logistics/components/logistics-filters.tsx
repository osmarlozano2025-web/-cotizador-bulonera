import type { LogisticsFilters, LogisticsReferenceData } from "../types";

interface LogisticsFiltersProps {
  readonly filters: LogisticsFilters;
  readonly referenceData: LogisticsReferenceData;
  readonly onChange: (next: LogisticsFilters) => void;
  readonly onReset: () => void;
}

function selectClassName(): string {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
}

function checkboxLabelClass(): string {
  return "flex items-center gap-2 text-sm text-muted-foreground";
}

export function LogisticsFilters({ filters, referenceData, onChange, onReset }: LogisticsFiltersProps): React.JSX.Element {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-3 xl:grid-cols-4">
      <select className={selectClassName()} value={filters.orderStatus} onChange={(event) => onChange({ ...filters, orderStatus: event.target.value as LogisticsFilters["orderStatus"] })}>
        {referenceData.orderStatusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.preparationStatus} onChange={(event) => onChange({ ...filters, preparationStatus: event.target.value as LogisticsFilters["preparationStatus"] })}>
        {referenceData.preparationStatusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.dispatchStatus} onChange={(event) => onChange({ ...filters, dispatchStatus: event.target.value as LogisticsFilters["dispatchStatus"] })}>
        {referenceData.dispatchStatusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.branchId} onChange={(event) => onChange({ ...filters, branchId: event.target.value as LogisticsFilters["branchId"] })}>
        {referenceData.branchOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.zoneId} onChange={(event) => onChange({ ...filters, zoneId: event.target.value })}>
        {referenceData.zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.driverId} onChange={(event) => onChange({ ...filters, driverId: event.target.value })}>
        {referenceData.driverOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.vehicleId} onChange={(event) => onChange({ ...filters, vehicleId: event.target.value })}>
        {referenceData.vehicleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={filters.dateRange} onChange={(event) => onChange({ ...filters, dateRange: event.target.value as LogisticsFilters["dateRange"] })}>
        <option value="all">Todas las fechas</option>
        <option value="today">Hoy</option>
        <option value="last7Days">Últimos 7 días</option>
        <option value="last30Days">Últimos 30 días</option>
      </select>
      <label className={checkboxLabelClass()}><input type="checkbox" checked={filters.hasMissingItems === true} onChange={(event) => onChange({ ...filters, hasMissingItems: event.target.checked ? true : "all" })} />Con faltantes</label>
      <label className={checkboxLabelClass()}><input type="checkbox" checked={filters.noGuide === true} onChange={(event) => onChange({ ...filters, noGuide: event.target.checked ? true : "all" })} />Sin guía</label>
      <label className={checkboxLabelClass()}><input type="checkbox" checked={filters.readyForDispatch === true} onChange={(event) => onChange({ ...filters, readyForDispatch: event.target.checked ? true : "all" })} />Listos para despacho</label>
      <label className={checkboxLabelClass()}><input type="checkbox" checked={filters.deliveryPending === true} onChange={(event) => onChange({ ...filters, deliveryPending: event.target.checked ? true : "all" })} />Entrega pendiente</label>
      <label className={checkboxLabelClass()}><input type="checkbox" checked={filters.deliveryFailed === true} onChange={(event) => onChange({ ...filters, deliveryFailed: event.target.checked ? true : "all" })} />Entrega fallida</label>
      <div className="flex items-end">
        <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}

