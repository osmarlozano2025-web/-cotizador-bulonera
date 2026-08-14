import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import type { OrderTotalsSummary } from "../types";

export function OrderTotals({
  totals,
}: {
  readonly totals: OrderTotalsSummary;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totales</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Subtotal</p>
          <p className="mt-1 font-medium">{formatCurrency(totals.subtotal)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Descuento</p>
          <p className="mt-1 font-medium">{formatCurrency(totals.discountTotal)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 font-semibold">{formatCurrency(totals.total)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ítems / unidades</p>
          <p className="mt-1 font-medium">{totals.itemsCount} / {totals.unitsCount}</p>
        </div>
      </CardContent>
    </Card>
  );
}

