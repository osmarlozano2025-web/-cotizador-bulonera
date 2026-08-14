import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import { OrderDispatchStatusBadge } from "./dispatch-status-badge";
import { OrderStatusBadge } from "./order-status-badge";
import { TangoSyncBadge } from "./tango-sync-badge";
import type { OrderPreviewRow } from "../types";

export function OrderTable({
  rows,
  onView,
  onEdit,
  onDuplicate,
}: {
  readonly rows: readonly OrderPreviewRow[];
  readonly onView: (orderId: OrderPreviewRow["order"]["id"]) => void;
  readonly onEdit: (orderId: OrderPreviewRow["order"]["id"]) => void;
  readonly onDuplicate: (orderId: OrderPreviewRow["order"]["id"]) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Despacho</th>
              <th className="px-4 py-3">Tango</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.order.id} className="border-b last:border-b-0">
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium">{row.order.number}</span>
                    <span className="text-xs text-muted-foreground">{formatCommercialDateTime(row.order.createdAt)}</span>
                  </div>
                </td>
                <td className="px-4 py-4">{row.clientName}</td>
                <td className="px-4 py-4">{row.sellerName}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <OrderStatusBadge status={row.order.status} />
                    {row.pendingApproval && <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Requiere autorización</span>}
                    {row.hasDebt && <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Con deuda</span>}
                  </div>
                </td>
                <td className="px-4 py-4"><OrderDispatchStatusBadge status={row.order.status === "prepared" ? "prepared" : row.order.status === "readyForDispatch" ? "ready" : row.order.status === "preparing" ? "preparing" : row.order.status === "dispatched" ? "dispatched" : "pending"} /></td>
                <td className="px-4 py-4"><TangoSyncBadge status={row.order.status === "sentToTango" ? "processing" : row.order.status === "invoiced" ? "sent" : row.order.status === "cancelled" ? "error" : "pending"} /></td>
                <td className="px-4 py-4 font-medium">{formatCurrency(row.order.total)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => onView(row.order.id)}>Ver</Button>
                    <Button type="button" variant="outline" onClick={() => onEdit(row.order.id)}>Editar</Button>
                    <Button type="button" variant="outline" onClick={() => onDuplicate(row.order.id)}>Duplicar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
