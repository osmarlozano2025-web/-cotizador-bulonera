import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { DispatchGuideTable } from "../components/dispatch-guide-table";
import { useDispatchGuides } from "../hooks/use-dispatch";
import { DEFAULT_DISPATCH_FILTERS } from "../types";

export function DispatchPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_DISPATCH_FILTERS);
  const queryFilters = useMemo(() => ({ ...filters, search }), [filters, search]);
  const { result, loading, error, referenceData } = useDispatchGuides(queryFilters, 1, 20);

  return (
    <ContentLayout>
      <PageHeader
        title="Guías de despacho"
        description="Listado operativo de guías, reparto y entregas simuladas."
        actions={(
          <Button asChild>
            <Link to="/logistics">Ir a logística</Link>
          </Button>
        )}
      />

      <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-3">
        <input className="h-10 rounded-md border px-3 text-sm lg:col-span-2" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por guía, pedido, cliente, repartidor o vehículo" />
        <select className="h-10 rounded-md border px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as typeof filters.status })}>
          {referenceData.dispatchStatusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select className="h-10 rounded-md border px-3 text-sm" value={filters.deliveryStatus} onChange={(event) => setFilters({ ...filters, deliveryStatus: event.target.value as typeof filters.deliveryStatus })}>
          {referenceData.deliveryStatusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <button type="button" className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent" onClick={() => { setFilters(DEFAULT_DISPATCH_FILTERS); setSearch(""); }}>
          Limpiar filtros
        </button>
      </div>

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando guías...</CardContent></Card>}
      {error && <Card><CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent></Card>}
      {!loading && !error && result && result.items.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No hay guías para mostrar.</CardContent></Card>}
      {!loading && !error && result && result.items.length > 0 && (
        <DispatchGuideTable
          rows={result.items}
          onView={(dispatchGuideId) => { void navigate(`/dispatch/${dispatchGuideId}`); }}
          onEdit={(dispatchGuideId) => { void navigate(`/dispatch/${dispatchGuideId}/edit`); }}
        />
      )}
    </ContentLayout>
  );
}
