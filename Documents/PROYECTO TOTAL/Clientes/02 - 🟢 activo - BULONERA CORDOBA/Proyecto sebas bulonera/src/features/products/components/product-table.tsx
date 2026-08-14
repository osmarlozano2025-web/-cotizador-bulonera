import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { ProductStatusBadge } from "./product-status-badge";
import { ProductStockBadge } from "./product-stock-badge";
import type { ProductListSort, ProductPreviewRow, ProductSortField } from "../types";

function SortButton({ field, label, sort, onSort }: { readonly field: ProductSortField; readonly label: string; readonly sort: ProductListSort; readonly onSort: (field: ProductSortField) => void }): React.JSX.Element {
  const indicator = sort.field === field ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  return <button type="button" className="font-medium hover:text-foreground" onClick={() => onSort(field)}>{label}{indicator}</button>;
}

export function ProductTable({
  rows,
  sort,
  onSort,
}: {
  readonly rows: readonly ProductPreviewRow[];
  readonly sort: ProductListSort;
  readonly onSort: (field: ProductSortField) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3"><SortButton field="internalCode" label="Código" sort={sort} onSort={onSort} /></th>
              <th className="px-4 py-3"><SortButton field="name" label="Nombre" sort={sort} onSort={onSort} /></th>
              <th className="px-4 py-3">Familia</th>
              <th className="px-4 py-3">Línea</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"><SortButton field="stockQuantity" label="Stock" sort={sort} onSort={onSort} /></th>
              <th className="px-4 py-3"><SortButton field="basePrice" label="Precio" sort={sort} onSort={onSort} /></th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product.id} className="border-b last:border-b-0">
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium">{row.product.internalCode}</span>
                    <span className="text-xs text-muted-foreground">{row.product.tangoCode ?? "Sin Tango"}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium">{row.product.name}</span>
                    <span className="text-xs text-muted-foreground">{row.product.brand ?? "Sin marca"}</span>
                  </div>
                </td>
                <td className="px-4 py-4">{row.familyName}</td>
                <td className="px-4 py-4">{row.lineName}</td>
                <td className="px-4 py-4"><ProductStatusBadge status={row.product.status} /></td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <ProductStockBadge state={row.stockState} />
                    <span className="text-xs text-muted-foreground">{row.product.stockQuantity} unidades</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-medium">{formatCurrency(row.product.basePrice)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link to={`/products/${row.product.id}`}>Ver</Link></Button>
                    <Button asChild variant="outline"><Link to={`/products/${row.product.id}/edit`}>Editar</Link></Button>
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
