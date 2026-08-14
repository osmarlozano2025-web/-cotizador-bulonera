import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import type { AccountOverdueDocument } from "../types";

export function AccountOverdueDocuments({
  documents,
}: {
  readonly documents: readonly AccountOverdueDocument[];
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos vencidos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay documentos vencidos en la simulación actual.</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{document.documentNumber}</p>
                <span className="text-xs text-muted-foreground">{document.daysPastDue} días</span>
              </div>
              <p className="text-muted-foreground">{document.description}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Vencimiento: {formatCommercialDateTime(document.dueDate)}</span>
                <span>Monto: {formatCurrency(document.amount)}</span>
                <span>Vencido: {formatCurrency(document.overdueAmount)}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
