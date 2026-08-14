import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/features/clients/utils/formatters";
import { ProductStatusBadge } from "./product-status-badge";
import { ProductStockBadge } from "./product-stock-badge";
import type { ProductDetailData } from "../types";

export function ProductSummary({ detail }: { readonly detail: ProductDetailData }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del producto</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre</p><p className="mt-1 font-medium">{detail.product.name}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Familia</p><p className="mt-1 font-medium">{detail.familyName}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Línea</p><p className="mt-1 font-medium">{detail.lineName ?? "Sin línea"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p><div className="mt-1 flex flex-wrap gap-2"><ProductStatusBadge status={detail.product.status} /><ProductStockBadge state={detail.stockState} /></div></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Código interno</p><p className="mt-1 font-medium">{detail.product.internalCode}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Tango</p><p className="mt-1 font-medium">{detail.product.tangoCode ?? "Sin Tango"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Precio base</p><p className="mt-1 font-medium">{formatCurrency(detail.product.basePrice)}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Stock</p><p className="mt-1 font-medium">{detail.product.stockQuantity}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Stock mínimo</p><p className="mt-1 font-medium">{detail.product.minimumStock ?? 0}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Unidad</p><p className="mt-1 font-medium">{detail.product.unitOfMeasure}</p></div>
        <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</p><p className="mt-1 text-sm text-muted-foreground">{detail.product.description}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Creado</p><p className="mt-1 font-medium">{formatDate(detail.product.createdAt)}</p></div>
      </CardContent>
    </Card>
  );
}

