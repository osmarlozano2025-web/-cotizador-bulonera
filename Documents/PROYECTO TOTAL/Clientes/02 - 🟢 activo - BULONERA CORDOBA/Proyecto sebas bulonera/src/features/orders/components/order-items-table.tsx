import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { calculateOrderLineDiscountAmount, calculateOrderLineSubtotal, calculateOrderLineTotal } from "../utils/order-calculations";
import type { OrderFormItemValues } from "../types";

export function OrderItemsTable({
  items,
}: {
  readonly items: readonly OrderFormItemValues[];
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
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const subtotal = calculateOrderLineSubtotal(item);
              const discountAmount = calculateOrderLineDiscountAmount(item);
              const total = calculateOrderLineTotal(item);

              return (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4">
                    <div className="grid gap-1">
                      <span className="font-medium">{item.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{item.quantity}</td>
                  <td className="px-4 py-4">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-4">
                    <div className="grid gap-1">
                      <span>{item.discountPercentage}%</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(discountAmount)}</span>
                    </div>
                  </td>
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
