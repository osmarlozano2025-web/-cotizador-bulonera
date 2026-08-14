import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import { QuoteAuthorizationBadge, QuoteStatusBadge } from "./quote-status-badge";
import { formatDate } from "@/features/clients/utils/formatters";
import type { QuoteDetailData } from "../types";

export function QuoteSummary({
  detail,
  authorizationStatus,
}: {
  readonly detail: QuoteDetailData;
  readonly authorizationStatus?: AuthorizationRequestStatus | null;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen general</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
          <p className="mt-1 font-medium">{detail.clientName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p>
          <p className="mt-1 font-medium">{detail.sellerName ?? "Sin asignar"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <QuoteStatusBadge status={detail.quote.status} />
            <QuoteAuthorizationBadge {...(authorizationStatus !== undefined ? { status: authorizationStatus } : {})} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vigencia</p>
          <p className="mt-1 font-medium">{formatDate(detail.quote.validUntil)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
