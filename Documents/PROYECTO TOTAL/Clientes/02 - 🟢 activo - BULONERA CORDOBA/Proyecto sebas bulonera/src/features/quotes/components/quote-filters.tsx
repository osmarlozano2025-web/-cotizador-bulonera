import type { QuoteStatus } from "@/domain/quote/quote";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuoteListFilters, QuoteReferenceData } from "../types";
import { getQuoteQuickFilterLabel } from "../utils/quote-labels";

const STATUS_OPTIONS: readonly { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "pendingApproval", label: "Pendiente de aprobación" },
  { value: "sent", label: "Enviada" },
  { value: "accepted", label: "Aceptada" },
  { value: "rejected", label: "Rechazada" },
  { value: "expired", label: "Vencida" },
  { value: "converted", label: "Convertida" },
  { value: "cancelled", label: "Cancelada" },
];

const DATE_OPTIONS: readonly { value: QuoteListFilters["dateRange"]; label: string }[] = [
  { value: "all", label: "Todas las fechas" },
  { value: "currentMonth", label: "Mes actual" },
  { value: "last30Days", label: "Últimos 30 días" },
];

const QUICK_FILTERS: readonly QuoteListFilters["quickView"][] = ["all", "expired", "accepted", "pending"];

export function QuoteFilters({
  filters,
  onChange,
  referenceData,
}: {
  readonly filters: QuoteListFilters;
  readonly referenceData: QuoteReferenceData;
  readonly onChange: (filters: QuoteListFilters) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Estado</span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as QuoteListFilters["status"] })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Vendedor</span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.sellerId}
            onChange={(event) => onChange({ ...filters, sellerId: event.target.value as QuoteListFilters["sellerId"] })}
          >
            <option value="all">Todos</option>
            <option value="unassigned">Sin asignar</option>
            {referenceData.sellerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Cliente</span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.clientId}
            onChange={(event) => onChange({ ...filters, clientId: event.target.value as QuoteListFilters["clientId"] })}
          >
            <option value="all">Todos</option>
            {referenceData.clientOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Fecha</span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.dateRange}
            onChange={(event) => onChange({ ...filters, dateRange: event.target.value as QuoteListFilters["dateRange"] })}
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-end gap-2 xl:col-span-1">
          {QUICK_FILTERS.map((quickView) => (
            <Button
              key={quickView}
              type="button"
              variant={filters.quickView === quickView ? "default" : "outline"}
              onClick={() => onChange({ ...filters, quickView })}
            >
              {getQuoteQuickFilterLabel(quickView)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
