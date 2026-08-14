import { Card, CardContent } from "@/components/ui/card";
import type { DispatchGuideDetail } from "../types";
import { DispatchStatusBadge } from "@/features/logistics/components/dispatch-status-badge";
import { DeliveryStatusBadge } from "@/features/logistics/components/delivery-status-badge";

interface DispatchGuideHeaderProps {
  readonly detail: DispatchGuideDetail;
}

export function DispatchGuideHeader({ detail }: DispatchGuideHeaderProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{detail.number}</p>
          <h2 className="text-xl font-semibold">{detail.clientName}</h2>
          <p className="text-sm text-muted-foreground">Pedido {detail.orderNumber} · {detail.locality}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DispatchStatusBadge status={detail.status} />
          <DeliveryStatusBadge status={detail.delivery?.status ?? "none"} />
        </div>
      </CardContent>
    </Card>
  );
}

