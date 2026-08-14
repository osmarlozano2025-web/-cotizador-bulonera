import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderDetailData } from "../types";

export function ApprovalBanner({
  detail,
}: {
  readonly detail: OrderDetailData;
}): React.JSX.Element | null {
  if (!detail.authorization.required) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex gap-3 p-4 text-amber-800">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="grid gap-2">
          <p className="font-medium">Pedido pendiente de autorización</p>
          <p className="text-sm">Este pedido queda preparado para revisión. La UI no bloquea el flujo, pero muestra el estado para continuar con la aprobación comercial.</p>
          {detail.authorization.reasons.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {detail.authorization.reasons.map((reason) => (
                <li key={reason.code}>• {reason.label}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

