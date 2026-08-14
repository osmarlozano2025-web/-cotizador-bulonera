import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { calculateQuoteItemDiscountAmount, calculateQuoteItemSubtotal, calculateQuoteItemTotal } from "../utils/quote-calculations";
import type { QuoteFormItemValues } from "../types";

export function QuoteItemTable({
  items,
}: {
  readonly items: readonly QuoteFormItemValues[];
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Descuento %</th>
              <th className="px-4 py-3">Descuento $</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const subtotal = calculateQuoteItemSubtotal(item);
              const discountAmount = calculateQuoteItemDiscountAmount(item);
              const total = calculateQuoteItemTotal(item);

              return (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4">{item.description}</td>
                  <td className="px-4 py-4">{item.quantity}</td>
                  <td className="px-4 py-4">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-4">{item.discountPercentage}%</td>
                  <td className="px-4 py-4">{formatCurrency(discountAmount)}</td>
                  <td className="px-4 py-4">{formatCurrency(subtotal)}</td>
                  <td className="px-4 py-4 font-medium">{formatCurrency(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
