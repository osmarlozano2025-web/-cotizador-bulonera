import { Button } from "@/components/ui/button";
import type { DispatchGuideId } from "@/domain/shared";
import type { DispatchGuideSummary } from "../types";
import { DispatchStatusBadge } from "@/features/logistics/components/dispatch-status-badge";
import { DeliveryStatusBadge } from "@/features/logistics/components/delivery-status-badge";

interface DispatchGuideTableProps {
  readonly rows: readonly DispatchGuideSummary[];
  readonly onView: (dispatchGuideId: DispatchGuideId) => void;
  readonly onEdit: (dispatchGuideId: DispatchGuideId) => void;
}

export function DispatchGuideTable({ rows, onView, onEdit }: DispatchGuideTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Guía</th>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Zona</th>
            <th className="px-4 py-3">Repartidor</th>
            <th className="px-4 py-3">Vehículo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Entrega</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{row.number}</td>
              <td className="px-4 py-3">{row.orderNumber}</td>
              <td className="px-4 py-3">{row.clientName}</td>
              <td className="px-4 py-3">{row.zoneName ?? "Sin zona"}</td>
              <td className="px-4 py-3">{row.driverName ?? "Sin repartidor"}</td>
              <td className="px-4 py-3">{row.vehicleCode ?? "Sin vehículo"}</td>
              <td className="px-4 py-3"><DispatchStatusBadge status={row.status} /></td>
              <td className="px-4 py-3"><DeliveryStatusBadge status={row.deliveryStatus} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onView(row.id)}>Ver</Button>
                  <Button type="button" onClick={() => onEdit(row.id)}>Editar</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
