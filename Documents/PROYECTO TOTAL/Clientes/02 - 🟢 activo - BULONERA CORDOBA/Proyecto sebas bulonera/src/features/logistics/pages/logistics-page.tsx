import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import type { BranchId } from "@/domain/shared";
import type { LogisticsReferenceData } from "../types";
import { LogisticsDashboard } from "../components/logistics-dashboard";
import { useLogisticsSummary, useOperationalOrders, useStartOrderPreparation, useCompleteOrderPreparation, useMarkReadyForDispatch } from "../hooks/use-logistics";
import { DEFAULT_LOGISTICS_FILTERS } from "../types";

export function LogisticsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_LOGISTICS_FILTERS);
  const queryFilters = useMemo(() => ({ ...filters, search }), [filters, search]);
  const referenceData = useMemo<LogisticsReferenceData>(() => ({
    orderStatusOptions: [
      { id: "all", label: "Todos" },
      { id: "draft", label: "Borrador" },
      { id: "pendingApproval", label: "Pendiente de aprobación" },
      { id: "approved", label: "Aprobado" },
      { id: "preparing", label: "En preparación" },
      { id: "prepared", label: "Preparado" },
      { id: "readyForDispatch", label: "Listo para despacho" },
      { id: "dispatched", label: "Despachado" },
      { id: "delivered", label: "Entregado" },
      { id: "cancelled", label: "Cancelado" },
    ],
    preparationStatusOptions: [
      { id: "all", label: "Todos" },
      { id: "pending", label: "Pendiente" },
      { id: "preparing", label: "En preparación" },
      { id: "partial", label: "Parcial" },
      { id: "prepared", label: "Preparado" },
      { id: "ready", label: "Listo" },
    ],
    dispatchStatusOptions: [
      { id: "all", label: "Todos" },
      { id: "none", label: "Sin guía" },
      { id: "pending", label: "Pendiente" },
      { id: "assigned", label: "Asignada" },
      { id: "preparing", label: "En preparación" },
      { id: "ready", label: "Lista" },
      { id: "dispatched", label: "Despachada" },
      { id: "delivered", label: "Entregada" },
      { id: "failed", label: "Fallida" },
      { id: "rescheduled", label: "Reprogramada" },
      { id: "cancelled", label: "Cancelada" },
    ],
    branchOptions: [
      { id: "all", label: "Todas las sucursales" },
      { id: "branch-central" as BranchId, label: "Casa Central" },
      { id: "branch-north" as BranchId, label: "Sucursal Norte" },
      { id: "branch-west" as BranchId, label: "Sucursal Oeste" },
    ],
    zoneOptions: [
      { id: "all", label: "Todas las zonas" },
      { id: "zone-centro", label: "Centro" },
      { id: "zone-norte", label: "Norte" },
      { id: "zone-sur", label: "Sur" },
      { id: "zone-mix", label: "Mixta" },
    ],
    driverOptions: [
      { id: "all", label: "Todos los repartidores" },
      { id: "driver-1", label: "Sergio López" },
      { id: "driver-2", label: "Luciana Pérez" },
      { id: "driver-3", label: "Martín Sosa" },
      { id: "driver-4", label: "Rocío Luna" },
    ],
    vehicleOptions: [
      { id: "all", label: "Todos los vehículos" },
      { id: "vehicle-1", label: "VAN-01 · AG-123-CD" },
      { id: "vehicle-2", label: "VAN-02 · AG-124-CD" },
      { id: "vehicle-3", label: "VAN-03 · AG-125-CD" },
      { id: "vehicle-4", label: "VAN-04 · AG-126-CD" },
    ],
  }), []);
  const { result, loading, error } = useOperationalOrders(queryFilters, 1, 20);
  const { summary } = useLogisticsSummary();
  const { startOrderPreparation } = useStartOrderPreparation();
  const { completeOrderPreparation } = useCompleteOrderPreparation();
  const { markOrderReadyForDispatch } = useMarkReadyForDispatch();

  return (
    <ContentLayout>
      <PageHeader
        title="Logística"
        description="Panel operativo para preparar pedidos, controlar faltantes y llevarlos hasta la guía de despacho."
        actions={(
          <Button asChild variant="outline">
            <Link to="/dispatch">Ver guías</Link>
          </Button>
        )}
      />

      <LogisticsDashboard
        title="Pedidos operativos"
        description="Buscá pedidos, controlá preparación y accedé al detalle de despacho."
        search={search}
        filters={filters}
        referenceData={referenceData}
        summary={summary}
        result={result}
        loading={loading}
        error={error}
        onSearchChange={setSearch}
        onFiltersChange={setFilters}
        onResetFilters={() => { setFilters(DEFAULT_LOGISTICS_FILTERS); setSearch(""); }}
        onViewOrder={(orderId) => { void navigate(`/logistics/orders/${orderId}`); }}
        onStartPreparation={(orderId) => { void startOrderPreparation(orderId).then(() => navigate(`/logistics/orders/${orderId}`)).catch(() => undefined); }}
        onContinuePreparation={(orderId) => { void navigate(`/logistics/orders/${orderId}`); }}
        onMarkPrepared={(orderId) => { void completeOrderPreparation(orderId).then(() => navigate(`/logistics/orders/${orderId}`)).catch(() => undefined); }}
        onGenerateGuide={(orderId) => { void markOrderReadyForDispatch(orderId).then(() => navigate(`/dispatch/new/${orderId}`)).catch(() => undefined); }}
        onViewGuide={(dispatchGuideId) => { void navigate(`/dispatch/${dispatchGuideId}`); }}
      />

      {!loading && !error && result?.items.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No hay pedidos operativos para mostrar.</CardContent>
        </Card>
      )}
    </ContentLayout>
  );
}
