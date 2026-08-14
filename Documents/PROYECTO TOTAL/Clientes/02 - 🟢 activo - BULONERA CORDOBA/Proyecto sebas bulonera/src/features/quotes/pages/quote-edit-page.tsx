import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import type { QuoteId } from "@/domain/shared";
import { QuoteForm } from "../components/quote-form";
import { useQuote, useUpdateQuote } from "../hooks/use-quotes";
import { getQuoteReferenceDataService } from "../services/quote-service";
import { mapQuoteToFormDefaults } from "../schemas/quote-schema";
import type { QuoteFormValues } from "../types";

export function QuoteEditPage(): React.JSX.Element {
  const { quoteId: quoteIdParam } = useParams();
  const quoteId = quoteIdParam as QuoteId | undefined;
  const navigate = useNavigate();
  const { detail, loading, error } = useQuote(quoteId);
  const { updateQuote, loading: saving } = useUpdateQuote(quoteId);
  const referenceData = getQuoteReferenceDataService();
  const [readyValues, setReadyValues] = useState<QuoteFormValues | null>(null);

  useEffect(() => {
    if (detail !== null) {
      const nextValues = mapQuoteToFormDefaults({
        clientId: detail.quote.clientId,
        sellerId: detail.quote.sellerId ?? "",
        status: detail.quote.status,
        validUntil: detail.quote.validUntil.slice(0, 10),
        commercialConditions: detail.quote.commercialConditions ?? "",
        notes: detail.quote.notes ?? "",
        items: detail.quote.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
        })),
      }, referenceData);

      globalThis.setTimeout(() => {
        setReadyValues(nextValues);
      }, 0);
    }
  }, [detail, referenceData]);

  const canRenderForm = useMemo(() => detail !== null && readyValues !== null, [detail, readyValues]);

  if (loading) {
    return <PageHeader title="Editar cotización" description="Cargando datos de la cotización..." />;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la cotización" description={error} />;
  }

  if (!canRenderForm || detail === null || readyValues === null) {
    return <EmptyState title="Cotización no encontrada" description="El registro solicitado no existe en la carga simulada." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader title={`Editar ${detail.quote.number}`} description="Actualizá los productos, descuentos y condiciones comerciales." />
      {saving && <EmptyState title="Guardando cambios" description="Procesando la actualización..." />}
      <QuoteForm
        title="Edición de cotización"
        description="Ajustá los campos comerciales de la cotización."
        referenceData={referenceData}
        initialValues={readyValues}
        submitLabel="Guardar cambios"
        onSubmit={(values) => {
          void (async () => {
            const quote = await updateQuote(values);
            void navigate(`/quotes/${quote.id}`, { state: { flashMessage: "Cotización actualizada correctamente." } });
          })().catch(() => undefined);
        }}
      />
    </div>
  );
}
