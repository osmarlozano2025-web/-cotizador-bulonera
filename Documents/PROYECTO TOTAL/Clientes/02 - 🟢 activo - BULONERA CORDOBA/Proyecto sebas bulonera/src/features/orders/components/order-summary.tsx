import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import { OrderDispatchStatusBadge } from "./dispatch-status-badge";
import { OrderStatusBadge } from "./order-status-badge";
import { TangoSyncBadge } from "./tango-sync-badge";
import type { OrderDetailData } from "../types";

export function OrderSummary({
  detail,
}: {
  readonly detail: OrderDetailData;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen operativo</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
          <p className="mt-1 font-medium">{detail.clientName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p>
          <p className="mt-1 font-medium">{detail.sellerName ?? "Sin asignar"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <OrderStatusBadge status={detail.order.status} />
            <OrderDispatchStatusBadge status={detail.dispatch.status} />
            <TangoSyncBadge status={detail.tango.status} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Creado / actualizado</p>
          <p className="mt-1 font-medium">{formatCommercialDateTime(detail.order.createdAt)} · {formatCommercialDateTime(detail.order.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Condición de pago</p>
          <p className="mt-1 font-medium">{detail.order.paymentCondition}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cotización origen</p>
          <p className="mt-1 font-medium">{detail.sourceQuoteNumber ?? "Sin cotización"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dirección</p>
          <p className="mt-1 font-medium">{detail.deliveryAddressLabel ?? "Sin dirección"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Autorización</p>
          <p className="mt-1 font-medium">{detail.authorization.required ? "Requerida" : "No requerida"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
