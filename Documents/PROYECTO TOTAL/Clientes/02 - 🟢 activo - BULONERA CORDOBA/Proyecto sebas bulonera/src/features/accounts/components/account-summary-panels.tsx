import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import type { AccountDetailData } from "../types";
import { AccountStateBadge, AccountMovementStatusBadge } from "./account-status-badge";
import { getCreditConditionLabel } from "../utils/account-labels";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "@/features/approvals/utils/approval-labels";

export function AccountSummaryPanels({
  detail,
}: {
  readonly detail: AccountDetailData;
}): React.JSX.Element {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(detail.currentBalance)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vencida</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(detail.debtSnapshot.overdueDebt.amount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Límite</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(detail.debtSnapshot.creditLimit.amount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Disponible</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatCurrency(detail.creditAvailable)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumen financiero</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p><div className="mt-1"><AccountStateBadge state={detail.accountStatus} /></div></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Condición</p><p className="mt-1 font-medium">{getCreditConditionLabel(detail.creditCondition)}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Días de mora</p><p className="mt-1 font-medium">{detail.daysPastDue}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Movimientos</p><p className="mt-1 font-medium">{detail.movementsCount}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Autorización</p><p className="mt-1 font-medium">{detail.approvalNumber ?? "Sin autorización"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado autorización</p><p className="mt-1 font-medium">{detail.approvalStatus ? getApprovalStatusLabel(detail.approvalStatus) : "Sin autorización"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo autorización</p><p className="mt-1 font-medium">{detail.approvalType ? getApprovalTypeLabel(detail.approvalType) : "Sin autorización"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Última actualización</p><p className="mt-1 font-medium">{formatCommercialDateTime(detail.lastUpdatedAt)}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluación comercial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p className="font-medium">{detail.evaluation.label}</p>
            <p className="text-muted-foreground">{detail.evaluation.recommendation}</p>
            <div className="grid gap-2">
              {detail.evaluation.reasons.map((reason) => (
                <p key={reason} className="text-muted-foreground">• {reason}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {detail.movements.slice(-3).map((movement) => (
            <div key={movement.id} className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
              <div className="grid gap-1">
                <p className="font-medium">{movement.documentNumber}</p>
                <p className="text-muted-foreground">{movement.description}</p>
              </div>
              <div className="grid justify-items-end gap-1">
                <AccountMovementStatusBadge status={movement.status} />
                <span className="text-xs text-muted-foreground">{formatCommercialDateTime(movement.createdAt)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
