import { Button } from "@/components/ui/button";
import type { OrderListFilters, OrderReferenceData } from "../types";

const selectClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function OrderFilters({
  filters,
  referenceData,
  onChange,
  onReset,
}: {
  readonly filters: OrderListFilters;
  readonly referenceData: OrderReferenceData;
  readonly onChange: (next: OrderListFilters) => void;
  readonly onReset: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
        <select className={selectClassName} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as OrderListFilters["status"] })}>
          <option value="all">Todos</option>
          <option value="draft">Borrador</option>
          <option value="pendingApproval">Pendiente de aprobación</option>
          <option value="approved">Aprobado</option>
          <option value="preparing">Preparando</option>
          <option value="prepared">Preparado</option>
          <option value="readyForDispatch">Listo para despacho</option>
          <option value="dispatched">Despachado</option>
          <option value="delivered">Entregado</option>
          <option value="sentToTango">Enviado a Tango</option>
          <option value="invoiced">Facturado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Cliente</span>
        <select className={selectClassName} value={filters.clientId} onChange={(event) => onChange({ ...filters, clientId: event.target.value as OrderListFilters["clientId"] })}>
          <option value="all">Todos</option>
          {referenceData.clientOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Vendedor</span>
        <select className={selectClassName} value={filters.sellerId} onChange={(event) => onChange({ ...filters, sellerId: event.target.value as OrderListFilters["sellerId"] })}>
          <option value="all">Todos</option>
          <option value="unassigned">Sin asignar</option>
          {referenceData.sellerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Rango</span>
        <select className={selectClassName} value={filters.dateRange} onChange={(event) => onChange({ ...filters, dateRange: event.target.value as OrderListFilters["dateRange"] })}>
          <option value="all">Todo</option>
          <option value="currentMonth">Mes actual</option>
          <option value="last30Days">Últimos 30 días</option>
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Vista rápida</span>
        <select className={selectClassName} value={filters.quickView} onChange={(event) => onChange({ ...filters, quickView: event.target.value as OrderListFilters["quickView"] })}>
          <option value="all">Todas</option>
          <option value="withDebt">Con deuda</option>
          <option value="pendingApproval">Pendientes</option>
          <option value="preparing">Preparando</option>
          <option value="dispatch">Despacho</option>
          <option value="sentToTango">Enviados a Tango</option>
          <option value="invoiced">Facturados</option>
        </select>
      </label>
      <div className="flex items-end md:col-span-2 xl:col-span-5">
        <Button type="button" variant="outline" onClick={onReset}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

