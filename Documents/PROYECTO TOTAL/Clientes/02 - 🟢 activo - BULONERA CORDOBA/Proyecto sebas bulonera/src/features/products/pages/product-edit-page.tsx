import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import type { ProductId } from "@/domain/shared";
import { getProductReferenceDataService } from "../services/product-service";
import { useProduct, useUpdateProduct } from "../hooks/use-products";
import { ProductForm } from "../components/product-form";
import { mapProductToFormDefaults } from "../schemas/product-schema";
import type { ProductFormValues } from "../types";

export function ProductEditPage(): React.JSX.Element {
  const { productId: productIdParam } = useParams();
  const productId = productIdParam as ProductId | undefined;
  const navigate = useNavigate();
  const referenceData = useMemo(() => getProductReferenceDataService(), []);
  const { detail, loading, error } = useProduct(productId);
  const { updateProduct, loading: saving, error: updateError } = useUpdateProduct(productId);
  const [readyValues, setReadyValues] = useState<ProductFormValues | null>(null);

  useEffect(() => {
    if (detail !== null) {
      const timer = globalThis.setTimeout(() => {
        setReadyValues(mapProductToFormDefaults(detail.product, referenceData));
      }, 0);
      return () => {
        globalThis.clearTimeout(timer);
      };
    }
  }, [detail, referenceData]);

  const canRenderForm = useMemo(() => detail !== null && readyValues !== null, [detail, readyValues]);

  if (loading) {
    return <ContentLayout><PageHeader title="Editar producto" description="Cargando datos del producto..." /></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el producto" description={error} />;
  }

  if (!canRenderForm || detail === null || readyValues === null) {
    return <EmptyState title="Producto no encontrado" description="El registro solicitado no existe en la carga simulada." />;
  }

  return (
    <ContentLayout>
      <PageHeader title={`Editar ${detail.product.name}`} description="Actualizá el catálogo sin alterar la estructura visual." />
      {saving && <EmptyState title="Guardando cambios" description="Procesando la actualización..." />}
      <ProductForm
        title="Edición de producto"
        description="Ajustá los datos de catálogo, stock y precio."
        referenceData={referenceData}
        initialValues={readyValues}
        submitLabel="Guardar cambios"
        submitError={updateError}
        requireChanges
        onCancel={() => void navigate(-1)}
        onSubmit={(values) => {
          void (async () => {
            const product = await updateProduct(values);
            void navigate(`/products/${product.id}`, { state: { productMessage: "Producto actualizado correctamente." } });
          })().catch(() => undefined);
        }}
      />
    </ContentLayout>
  );
}
