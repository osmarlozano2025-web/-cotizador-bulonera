import { Button } from "@/components/ui/button";
import type { OrderId, DispatchGuideId } from "@/domain/shared";
import type { LogisticsOrderSummary } from "../types";
import { DispatchStatusBadge } from "./dispatch-status-badge";
import { DeliveryStatusBadge } from "./delivery-status-badge";
import { PreparationStatusBadge } from "./preparation-status-badge";
import { getLogisticsOrderStatusLabel } from "../utils/logistics-labels";

interface OperationalOrderTableProps {
  readonly rows: readonly LogisticsOrderSummary[];
  readonly onViewOrder: (orderId: OrderId) => void;
  readonly onStartPreparation: ((orderId: OrderId) => void) | undefined;
  readonly onContinuePreparation: ((orderId: OrderId) => void) | undefined;
  readonly onMarkPrepared: ((orderId: OrderId) => void) | undefined;
  readonly onGenerateGuide: ((orderId: OrderId) => void) | undefined;
  readonly onViewGuide: ((dispatchGuideId: DispatchGuideId) => void) | undefined;
}

export function OperationalOrderTable({
  rows,
  onViewOrder,
  onStartPreparation,
  onContinuePreparation,
  onMarkPrepared,
  onGenerateGuide,
  onViewGuide,
}: OperationalOrderTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Localidad</th>
            <th className="px-4 py-3">Vendedor</th>
            <th className="px-4 py-3">Productos</th>
            <th className="px-4 py-3">Unidades</th>
            <th className="px-4 py-3">Estado pedido</th>
            <th className="px-4 py-3">Preparación</th>
            <th className="px-4 py-3">Despacho</th>
            <th className="px-4 py-3">Entrega</th>
            <th className="px-4 py-3">Fecha prevista</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.orderId} className="border-b last:border-b-0">
              <td className="px-4 py-4 font-medium">{row.orderNumber}</td>
              <td className="px-4 py-4 text-muted-foreground">{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(row.orderDate))}</td>
              <td className="px-4 py-4">{row.clientName}</td>
              <td className="px-4 py-4">{row.locality}</td>
              <td className="px-4 py-4">{row.sellerName ?? "Sin vendedor"}</td>
              <td className="px-4 py-4">{row.productsCount}</td>
              <td className="px-4 py-4">{row.unitsCount}</td>
              <td className="px-4 py-4">{getLogisticsOrderStatusLabel(row.orderStatus)}</td>
              <td className="px-4 py-4"><PreparationStatusBadge status={row.preparationStatus} /></td>
              <td className="px-4 py-4"><DispatchStatusBadge status={row.dispatchStatus} /></td>
              <td className="px-4 py-4"><DeliveryStatusBadge status={row.deliveryStatus} /></td>
              <td className="px-4 py-4 text-muted-foreground">{row.expectedDate ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(row.expectedDate)) : "Sin fecha"}</td>
              <td className="px-4 py-4">
                {(() => {
                  const dispatchGuideId = row.dispatchGuideId;
                  return (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => onViewOrder(row.orderId)}>Ver pedido</Button>
                  {row.canStartPreparation && onStartPreparation && <Button type="button" onClick={() => onStartPreparation(row.orderId)}>Iniciar preparación</Button>}
                  {row.canContinuePreparation && onContinuePreparation && <Button type="button" variant="outline" onClick={() => onContinuePreparation(row.orderId)}>Continuar preparación</Button>}
                  {row.canCreateGuide && onMarkPrepared && <Button type="button" variant="outline" onClick={() => onMarkPrepared(row.orderId)}>Marcar preparado</Button>}
                  {row.canCreateGuide && onGenerateGuide && <Button type="button" onClick={() => onGenerateGuide(row.orderId)}>Generar guía</Button>}
                  {dispatchGuideId !== undefined && onViewGuide && <Button type="button" variant="outline" onClick={() => onViewGuide(dispatchGuideId as DispatchGuideId)}>Ver guía</Button>}
                </div>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
