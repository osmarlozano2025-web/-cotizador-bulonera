import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApprovalPreviewRow } from "../types";
import { ApprovalStatusBadge, ApprovalTypeBadge } from "./approval-status-badge";

export function ApprovalTable({
  rows,
  search = "",
}: {
  readonly rows: readonly ApprovalPreviewRow[];
  readonly search?: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Solicitado por</th>
              <th className="px-4 py-3">Asignado a</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.request.id} className="border-b last:border-b-0">
                <td className="px-4 py-4 font-medium">{row.number}</td>
                <td className="px-4 py-4"><ApprovalTypeBadge type={row.request.type} /></td>
                <td className="px-4 py-4">{row.clientName}</td>
                <td className="px-4 py-4">{row.sellerName}</td>
                <td className="px-4 py-4"><ApprovalStatusBadge status={row.request.status} /></td>
                <td className="px-4 py-4">{row.requestedByName}</td>
                <td className="px-4 py-4">{row.assignedToName}</td>
                <td className="px-4 py-4">{row.relatedLabel}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link to={{ pathname: `/approvals/${row.request.id}`, search }}>Ver</Link></Button>
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
