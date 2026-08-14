import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { QuoteActions } from "../components/quote-actions";
import { QuoteItemTable } from "../components/quote-item-table";
import { QuoteSummary } from "../components/quote-summary";
import { QuoteTotals } from "../components/quote-totals";
import { QuoteAuthorizationBadge } from "../components/quote-status-badge";
import { useConvertQuote, useDuplicateQuote, useQuote } from "../hooks/use-quotes";
import type { QuoteId } from "@/domain/shared";
import { formatDateTime } from "@/features/clients/utils/formatters";
import { QuoteStatusBadge } from "../components/quote-status-badge";
import type { QuoteConversionPreview } from "../types";
import { ApprovalStatusBadge } from "@/features/approvals/components/approval-status-badge";
import { useApprovalByQuoteId } from "@/features/approvals/hooks/use-approvals";
import { canConvertQuoteWithApproval } from "@/features/approvals/utils/approval-rules";
import { downloadQuotePdf } from "../utils/quote-document";

export function QuoteDetailPage(): React.JSX.Element {
  const { quoteId: quoteIdParam } = useParams();
  const quoteId = quoteIdParam as QuoteId | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { detail, loading, error, refresh, capabilities } = useQuote(quoteId);
  const { duplicateQuote } = useDuplicateQuote();
  const { convertQuote } = useConvertQuote();
  const { detail: approvalDetail, loading: approvalLoading } = useApprovalByQuoteId(quoteId);
  const [conversionPreview, setConversionPreview] = useState<QuoteConversionPreview | null>(null);
  const [feedback, setFeedback] = useState<string | null>(() => {
    const state = location.state as { flashMessage?: string } | null;
    return typeof state?.flashMessage === "string" ? state.flashMessage : null;
  });

  const history = useMemo(() => detail?.history ?? [], [detail?.history]);
  const canConvertWithApproval = detail === null ? false : canConvertQuoteWithApproval(detail.quote, approvalDetail?.request.status ?? null);

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando cotización...</CardContent></Card>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la cotización" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Cotización no encontrada" description="El registro solicitado no está disponible en la carga simulada." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={detail.quote.number}
        description={`${detail.clientName} · ${detail.quote.clientId}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/quotes">Volver</Link>
            </Button>
            <QuoteActions
              detail={detail}
              canEdit={capabilities.canEdit || capabilities.canEditOwn}
              canDuplicate={capabilities.canDuplicate}
              canConvert={capabilities.canConvert && detail.quote.status === "accepted" && canConvertWithApproval}
              onEdit={() => {
                void navigate(`/quotes/${detail.quote.id}/edit`);
              }}
              onDuplicate={() => {
                void (async () => {
                  const duplicated = await duplicateQuote(detail.quote.id);
                  void navigate(`/quotes/${duplicated.id}`, { state: { flashMessage: "Cotización duplicada correctamente." } });
                })().catch(() => undefined);
              }}
              onConvert={() => {
                void (async () => {
                  const preview = await convertQuote(detail.quote.id);
                  if (preview !== null) {
                    setConversionPreview(preview);
                    setFeedback("Cotización convertida correctamente.");
                    await refresh();
                  }
                })().catch(() => undefined);
              }}
              {...(capabilities.canPrint
                ? {
                    onPrint: () => {
                      globalThis.print();
                    },
                  }
                : {})}
              {...(capabilities.canDownloadPdf
                ? {
                    onDownloadPdf: () => {
                      downloadQuotePdf(detail);
                      setFeedback("PDF descargado correctamente.");
                    },
                  }
                : {})}
            />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <QuoteStatusBadge status={detail.quote.status} />
        <QuoteAuthorizationBadge {...(!approvalLoading ? { status: approvalDetail?.request.status ?? null } : {})} />
      </div>

      {feedback && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 text-sm text-sky-800">{feedback}</CardContent>
        </Card>
      )}

      {approvalDetail && (
        <Card>
          <CardHeader>
            <CardTitle>Autorización vinculada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <ApprovalStatusBadge status={approvalDetail.request.status} />
            <span className="text-muted-foreground">{approvalDetail.number}</span>
            <span className="text-muted-foreground">{approvalDetail.relatedLabel ?? "Sin referencia"}</span>
            <Link className="text-primary underline-offset-4 hover:underline" to={`/approvals/${approvalDetail.request.id}`}>Abrir autorización</Link>
          </CardContent>
        </Card>
      )}

      {conversionPreview !== null && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-700">Simulación de conversión</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-emerald-800">
            <p>{conversionPreview.message}</p>
            {conversionPreview.preparedOrderDraft && <p>Pedido borrador preparado con {conversionPreview.preparedOrderDraft.items.length} ítems.</p>}
            {conversionPreview.convertedAt && <p>Generado: {formatDateTime(conversionPreview.convertedAt)}</p>}
          </CardContent>
        </Card>
      )}

      <QuoteSummary detail={detail} {...(!approvalLoading ? { authorizationStatus: approvalDetail?.request.status ?? null } : {})} />
      <QuoteItemTable
        items={detail.quote.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
        }))}
      />
      <QuoteTotals totals={detail.totals} />

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {history.map((entry) => (
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
    </div>
  );
}
