import { BadgeAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderDetailData } from "../types";

export function CreditWarning({
  detail,
}: {
  readonly detail: OrderDetailData;
}): React.JSX.Element | null {
  if (!detail.clientBlocked && !detail.authorization.required) {
    return null;
  }

  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="flex gap-3 p-4 text-rose-800">
        <BadgeAlert className="mt-0.5 size-5 shrink-0" />
        <div className="grid gap-1">
          <p className="font-medium">Control de deuda activado</p>
          <p className="text-sm">El pedido no se bloquea, pero el circuito ya quedó preparado para revisar deuda, crédito disponible y autorización comercial.</p>
        </div>
      </CardContent>
    </Card>
  );
}

