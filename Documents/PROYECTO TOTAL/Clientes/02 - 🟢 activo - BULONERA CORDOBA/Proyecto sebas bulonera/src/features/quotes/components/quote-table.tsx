import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteAuthorizationBadge, QuoteStatusBadge } from "./quote-status-badge";
import { formatCurrency, formatDate } from "@/features/clients/utils/formatters";
import type { QuotePreviewRow } from "../types";

export function QuoteTable({
  rows,
  onView,
  onEdit,
  onDuplicate,
  onConvert,
}: {
  readonly rows: readonly QuotePreviewRow[];
  readonly onView: (quoteId: QuotePreviewRow["quote"]["id"]) => void;
  readonly onEdit: (quoteId: QuotePreviewRow["quote"]["id"]) => void;
  readonly onDuplicate: (quoteId: QuotePreviewRow["quote"]["id"]) => void;
  readonly onConvert: (quoteId: QuotePreviewRow["quote"]["id"]) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.quote.id} className="border-b last:border-b-0">
                <td className="px-4 py-4 font-medium">{row.quote.number}</td>
                <td className="px-4 py-4">{formatDate(row.quote.createdAt)}</td>
                <td className="px-4 py-4">{row.clientName}</td>
                <td className="px-4 py-4">{row.sellerName}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <QuoteStatusBadge status={row.quote.status} />
                    <QuoteAuthorizationBadge status={row.authorizationStatus} />
                  </div>
                </td>
                <td className="px-4 py-4">{formatCurrency(row.quote.subtotal)}</td>
                <td className="px-4 py-4">{formatCurrency(row.quote.discountTotal)}</td>
                <td className="px-4 py-4 font-medium">{formatCurrency(row.quote.total)}</td>
                <td className="px-4 py-4">{row.dueLabel}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => onView(row.quote.id)}>
                      Ver
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onDuplicate(row.quote.id)}>
                      Duplicar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onEdit(row.quote.id)}>
                      Editar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onConvert(row.quote.id)} disabled={!row.canConvert}>
                      Convertir
                    </Button>
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
