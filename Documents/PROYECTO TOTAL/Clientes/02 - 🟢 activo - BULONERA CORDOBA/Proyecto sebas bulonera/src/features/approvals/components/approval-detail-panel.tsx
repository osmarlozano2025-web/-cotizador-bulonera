import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import { ApprovalStatusBadge, ApprovalTypeBadge } from "./approval-status-badge";
import type { ApprovalDetailData } from "../types";

export function ApprovalDetailPanel({ detail }: { readonly detail: ApprovalDetailData }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de autorización</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Número</p><p className="mt-1 font-medium">{detail.number}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</p><div className="mt-1"><ApprovalTypeBadge type={detail.request.type} /></div></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p><div className="mt-1"><ApprovalStatusBadge status={detail.request.status} /></div></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p><p className="mt-1 font-medium">{detail.clientName}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p><p className="mt-1 font-medium">{detail.sellerName ?? "Sin vendedor"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Solicitado por</p><p className="mt-1 font-medium">{detail.requestedByName}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Asignado a</p><p className="mt-1 font-medium">{detail.assignedToName ?? "Sin asignar"}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Referencia</p><p className="mt-1 font-medium">{detail.relatedLabel ?? "Manual"}</p></div>
        <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Motivo</p><p className="mt-1 text-sm text-muted-foreground">{detail.request.reason}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Creada</p><p className="mt-1 font-medium">{formatCommercialDateTime(detail.request.createdAt)}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Ruta</p><p className="mt-1 font-medium">{detail.relatedRoute ?? "Sin ruta"}</p></div>
      </CardContent>
    </Card>
  );
}
