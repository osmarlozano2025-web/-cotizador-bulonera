import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { getOrderFormDefaultsFromQuote, getOrderReferenceDataService } from "../services/order-service";
import { OrderForm } from "../components/order-form";
import { useCreateOrder } from "../hooks/use-orders";
import type { OrderFormValues } from "../types";
import { buildOrderFormDefaults, mapQuoteToOrderFormDefaults } from "../schemas/order-schema";
import { getQuoteDetailData } from "@/features/quotes/services/quote-service";
import type { QuoteId } from "@/domain/shared";

export function OrderNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referenceData = useMemo(() => getOrderReferenceDataService(), []);
  const { createOrder, loading, error } = useCreateOrder();
  const [initialValues, setInitialValues] = useState<OrderFormValues | undefined>(undefined);

  useEffect(() => {
    const quoteId = searchParams.get("quoteId");
    if (quoteId === null || quoteId.length === 0) {
      const timer = globalThis.setTimeout(() => {
        setInitialValues(buildOrderFormDefaults(referenceData));
      }, 0);
      return () => {
        globalThis.clearTimeout(timer);
      };
    }

    void (async () => {
      const valuesFromService = await getOrderFormDefaultsFromQuote(quoteId as QuoteId);
      if (valuesFromService !== null) {
        globalThis.setTimeout(() => {
          setInitialValues(valuesFromService);
        }, 0);
        return;
      }

      const quoteDetail = await getQuoteDetailData(quoteId as QuoteId);
      if (quoteDetail !== null) {
        globalThis.setTimeout(() => {
          setInitialValues(mapQuoteToOrderFormDefaults(quoteDetail.quote, referenceData));
        }, 0);
        return;
      }

      globalThis.setTimeout(() => {
        setInitialValues(buildOrderFormDefaults(referenceData));
      }, 0);
    })().catch(() => undefined);
  }, [referenceData, searchParams]);

  if (error) {
    return <EmptyState title="No se pudo preparar el pedido" description={error} />;
  }

  return (
    <ContentLayout>
      <PageHeader title="Nuevo pedido" description="Armá un pedido manualmente o desde una cotización aprobada." />
      {loading && <EmptyState title="Guardando pedido" description="Procesando la simulación..." />}
      {initialValues !== undefined && (
        <OrderForm
          title="Creación de pedido"
          description="Completá el cliente, los ítems y las condiciones operativas."
          referenceData={referenceData}
          initialValues={initialValues}
          submitLabel="Guardar pedido"
          onSubmit={(values) => {
            void (async () => {
              const order = await createOrder(values, values.sourceQuoteId.length > 0 ? (values.sourceQuoteId as QuoteId) : undefined);
              void navigate(`/orders/${order.id}`);
            })().catch(() => undefined);
          }}
        />
      )}
    </ContentLayout>
  );
}
