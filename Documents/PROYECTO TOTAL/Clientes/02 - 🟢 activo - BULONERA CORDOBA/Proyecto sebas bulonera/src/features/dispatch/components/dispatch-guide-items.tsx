import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DispatchGuideItem } from "@/domain/dispatch/dispatch-guide";

export function DispatchGuideItems({ items }: { readonly items: readonly DispatchGuideItem[] }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ítems de la guía</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Cantidad preparada</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{item.productId}</td>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{item.unitOfMeasure ?? "—"}</td>
                <td className="px-4 py-3">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
