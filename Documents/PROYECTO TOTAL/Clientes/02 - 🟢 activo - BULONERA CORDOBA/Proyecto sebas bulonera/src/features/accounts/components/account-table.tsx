import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import type { AccountSummary } from "../types";
import { AccountStateBadge } from "./account-status-badge";
import { getCreditConditionLabel } from "../utils/account-labels";
import { getApprovalStatusLabel } from "@/features/approvals/utils/approval-labels";

export function AccountTable({
  rows,
}: {
  readonly rows: readonly AccountSummary[];
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Deuda</th>
              <th className="px-4 py-3">Vencida</th>
              <th className="px-4 py-3">Límite</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Mora</th>
              <th className="px-4 py-3">Actualizado</th>
              <th className="px-4 py-3">Autorización</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clientId} className="border-b last:border-b-0">
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium">{row.clientName}</span>
                    <span className="text-xs text-muted-foreground">{row.clientCode}</span>
                    {row.tradeName && <span className="text-xs text-muted-foreground">{row.tradeName}</span>}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <AccountStateBadge state={row.accountStatus} />
                    <span className="text-xs text-muted-foreground">{getCreditConditionLabel(row.creditCondition)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-medium">{formatCurrency(row.currentBalance)}</td>
                <td className="px-4 py-4">{formatCurrency(row.debtSnapshot.overdueDebt.amount)}</td>
                <td className="px-4 py-4">{formatCurrency(row.debtSnapshot.creditLimit.amount)}</td>
                <td className="px-4 py-4">{formatCurrency(row.creditAvailable)}</td>
                <td className="px-4 py-4">{row.daysPastDue}</td>
                <td className="px-4 py-4">{formatCommercialDateTime(row.lastUpdatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium">{row.approvalNumber ?? "Sin autorización"}</span>
                    <span className="text-xs text-muted-foreground">{row.approvalStatus ? getApprovalStatusLabel(row.approvalStatus) : "Sin autorización"}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link to={`/accounts/${row.clientId}`}>Ver detalle</Link></Button>
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
