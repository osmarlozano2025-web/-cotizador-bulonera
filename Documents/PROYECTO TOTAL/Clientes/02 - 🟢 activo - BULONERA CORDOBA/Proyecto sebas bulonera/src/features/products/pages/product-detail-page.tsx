import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { formatDateTime } from "@/features/clients/utils/formatters";
import type { ProductId } from "@/domain/shared";
import { ProductSummary } from "../components/product-summary";
import { ProductStatusBadge } from "../components/product-status-badge";
import { ProductStockBadge } from "../components/product-stock-badge";
import { useProduct } from "../hooks/use-products";

export function ProductDetailPage(): React.JSX.Element {
  const { productId: productIdParam } = useParams();
  const productId = productIdParam as ProductId | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as { readonly productMessage?: string } | null;
  const { detail, loading, error, refresh, capabilities } = useProduct(productId);

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando producto...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el producto" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Producto no encontrado" description="El registro solicitado no está disponible en la carga simulada." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={detail.product.name}
        description={`${detail.product.internalCode} · ${detail.familyName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/products">Volver</Link>
            </Button>
            {capabilities.canEdit && (
              <Button asChild>
                <Link to={`/products/${detail.product.id}/edit`}>Editar</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ProductStatusBadge status={detail.product.status} />
        <ProductStockBadge state={detail.stockState} />
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{detail.product.internalCode}</span>
      </div>

      {navigationState?.productMessage && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{navigationState.productMessage}</p>
      )}

      <ProductSummary detail={detail} />

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {detail.history.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.date)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {capabilities.canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Refrescar
          </Button>
          <Button variant="outline" onClick={() => void navigate(`/products/${detail.product.id}/edit`)}>
            Editar producto
          </Button>
        </div>
      )}
    </ContentLayout>
  );
}
