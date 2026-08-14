import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { QuoteForm } from "../components/quote-form";
import { useCreateQuote } from "../hooks/use-quotes";
import { getQuoteReferenceDataService } from "../services/quote-service";

export function QuoteNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const referenceData = getQuoteReferenceDataService();
  const { createQuote, loading, error } = useCreateQuote();

  if (error) {
    return <EmptyState title="No se pudo preparar la cotización" description={error} />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Nueva cotización" description="Armá una propuesta comercial con productos, descuentos y vigencia." />
      {loading && <EmptyState title="Guardando cotización" description="Procesando la simulación..." />}
      <QuoteForm
        title="Creación de cotización"
        description="Completá el cliente, el vendedor y los ítems para generar una nueva cotización."
        referenceData={referenceData}
        submitLabel="Guardar cotización"
        onSubmit={(values) => {
          void (async () => {
            const quote = await createQuote(values);
            void navigate(`/quotes/${quote.id}`, { state: { flashMessage: "Cotización creada correctamente." } });
          })().catch(() => undefined);
        }}
      />
    </div>
  );
}
