import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import type { QuoteTotalsSummary } from "../types";

export function QuoteTotals({
  totals,
}: {
  readonly totals: QuoteTotalsSummary;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totales</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidades</p>
          <p className="mt-1 font-medium">{totals.unitsCount}</p>
        </div>
      </CardContent>
    </Card>
  );
}
