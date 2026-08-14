import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { getProductReferenceDataService } from "../services/product-service";
import { ProductForm } from "../components/product-form";
import { useCreateProduct } from "../hooks/use-products";
import { buildProductFormDefaults } from "../schemas/product-schema";

export function ProductNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const referenceData = useMemo(() => getProductReferenceDataService(), []);
  const { createProduct, loading, error } = useCreateProduct();

  return (
    <ContentLayout>
      <PageHeader title="Nuevo producto" description="Alta simulada preparada para el catálogo operativo." />
      {loading && <EmptyState title="Guardando producto" description="Procesando la simulación..." />}
      <ProductForm
        title="Creación de producto"
        description="Completá el catálogo, la familia, la línea y el stock inicial."
        referenceData={referenceData}
        initialValues={buildProductFormDefaults(referenceData)}
        submitLabel="Guardar producto"
        submitError={error}
        onCancel={() => void navigate(-1)}
        onSubmit={(values) => {
          void (async () => {
            const product = await createProduct(values);
            void navigate(`/products/${product.id}`, { state: { productMessage: "Producto creado correctamente." } });
          })().catch(() => undefined);
        }}
      />
    </ContentLayout>
  );
}
