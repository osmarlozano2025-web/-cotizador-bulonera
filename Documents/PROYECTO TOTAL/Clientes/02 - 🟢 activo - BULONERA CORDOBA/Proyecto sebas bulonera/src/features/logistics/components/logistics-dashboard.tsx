import { LogisticsSearch } from "./logistics-search";
import { LogisticsFilters } from "./logistics-filters";
import { LogisticsSummaryCards } from "./logistics-summary-cards";
import { OperationalOrderTable } from "./operational-order-table";
import { LogisticsEmptyState } from "./logistics-empty-state";
import type { DispatchGuideId, OrderId } from "@/domain/shared";
import type { LogisticsFilters as LogisticsFiltersType, LogisticsListResult, LogisticsReferenceData, LogisticsSummary } from "../types";

interface LogisticsDashboardProps {
  readonly title: string;
  readonly description: string;
  readonly search: string;
  readonly filters: LogisticsFiltersType;
  readonly referenceData: LogisticsReferenceData;
  readonly summary: LogisticsSummary | null;
  readonly result: LogisticsListResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSearchChange: (value: string) => void;
  readonly onFiltersChange: (next: LogisticsFiltersType) => void;
  readonly onResetFilters: () => void;
  readonly onViewOrder: (orderId: OrderId) => void;
  readonly onStartPreparation: ((orderId: OrderId) => void) | undefined;
  readonly onContinuePreparation: ((orderId: OrderId) => void) | undefined;
  readonly onMarkPrepared: ((orderId: OrderId) => void) | undefined;
  readonly onGenerateGuide: ((orderId: OrderId) => void) | undefined;
  readonly onViewGuide: ((dispatchGuideId: DispatchGuideId) => void) | undefined;
}

export function LogisticsDashboard({
  title,
  description,
  search,
  filters,
  referenceData,
  summary,
  result,
  loading,
  error,
  onSearchChange,
  onFiltersChange,
  onResetFilters,
  onViewOrder,
  onStartPreparation,
  onContinuePreparation,
  onMarkPrepared,
  onGenerateGuide,
  onViewGuide,
}: LogisticsDashboardProps): React.JSX.Element {
  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {summary && <LogisticsSummaryCards summary={summary} />}
      <LogisticsSearch value={search} onChange={onSearchChange} />
      <LogisticsFilters filters={filters} referenceData={referenceData} onChange={onFiltersChange} onReset={onResetFilters} />
      {loading && <p className="text-sm text-muted-foreground">Cargando logística...</p>}
      {error && <LogisticsEmptyState title="No se pudo cargar la logística" description={error} />}
      {!loading && !error && result !== null && result.items.length === 0 && <LogisticsEmptyState />}
      {!loading && !error && result !== null && result.items.length > 0 && (
        <OperationalOrderTable
          rows={result.items}
          onViewOrder={onViewOrder}
          onStartPreparation={onStartPreparation}
          onContinuePreparation={onContinuePreparation}
          onMarkPrepared={onMarkPrepared}
          onGenerateGuide={onGenerateGuide}
          onViewGuide={onViewGuide}
        />
      )}
    </div>
  );
}
