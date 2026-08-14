import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { QuoteHeader } from "../components/quote-header";
import { QuoteFilters } from "../components/quote-filters";
import { QuoteSearch } from "../components/quote-search";
import { QuoteTable } from "../components/quote-table";
import { useQuotes, useDuplicateQuote, useConvertQuote } from "../hooks/use-quotes";
import { PageHeader } from "@/components/common/page-header";

export function QuotesPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters, result, previewRows, loading, error, refresh, capabilities, referenceData } = useQuotes();
  const { duplicateQuote } = useDuplicateQuote();
  const { convertQuote } = useConvertQuote();

  return (
    <div className="grid gap-6">
      <QuoteHeader
        title="Cotizaciones"
        description="Gestioná el circuito comercial inicial con creación, edición, consulta, duplicado y simulación de conversión."
        actions={
          capabilities.canCreate ? (
            <Button asChild>
              <Link to="/quotes/new">Nueva cotización</Link>
            </Button>
          ) : undefined
        }
      />

      <PageHeader title="Listado operativo" description="Buscá por número, cliente, vendedor, producto o estado y afiná la vista con filtros rápidos." />

      <QuoteSearch
        value={filters.search}
        onChange={(value) => {
          setFilters({ ...filters, search: value });
        }}
      />

      <QuoteFilters
        filters={filters}
        referenceData={referenceData}
        onChange={(next) => {
          setFilters(next);
        }}
      />

      {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando cotizaciones...</CardContent></Card>}
      {error && <EmptyState title="No se pudieron cargar las cotizaciones" description={error} />}
      {!loading && !error && result !== null && previewRows.length === 0 && (
        <div className="grid gap-4">
          <EmptyState
            title="No hay cotizaciones para mostrar"
            description="Probá limpiando filtros o creando una nueva cotización."
          />
          {capabilities.canCreate && (
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/quotes/new">Crear cotización</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && previewRows.length > 0 && (
        <QuoteTable
          rows={previewRows}
          onView={(quoteId) => {
            void navigate(`/quotes/${quoteId}`);
          }}
          onEdit={(quoteId) => {
            void navigate(`/quotes/${quoteId}/edit`);
          }}
          onDuplicate={(quoteId) => {
            void (async () => {
              const duplicated = await duplicateQuote(quoteId);
              await refresh();
              void navigate(`/quotes/${duplicated.id}`, { state: { flashMessage: "Cotización duplicada correctamente." } });
            })().catch(() => undefined);
          }}
          onConvert={(quoteId) => {
            void (async () => {
              await convertQuote(quoteId);
              await refresh();
            })().catch(() => undefined);
          }}
        />
      )}

      {!loading && !error && result !== null && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {result.items.length} de {result.total} cotizaciones
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetFilters();
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
