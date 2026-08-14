import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import type { ClientId } from "@/domain/shared";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import { AccountAlertBanner } from "../components/account-alert-banner";
import { AccountHeader } from "../components/account-header";
import { AccountMovementTable } from "../components/account-movement-table";
import { AccountOverdueDocuments } from "../components/account-overdue-documents";
import { AccountSummaryPanels } from "../components/account-summary-panels";
import { useAccount } from "../hooks/use-accounts";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "@/features/approvals/utils/approval-labels";
import type { AccountAdjustmentInput } from "../types";

export function AccountDetailPage(): React.JSX.Element {
  const { clientId: clientIdParam } = useParams();
  const clientId = clientIdParam as ClientId | undefined;
  const { detail, loading, error, refresh, createMockAdjustment, requestDebtApproval } = useAccount(clientId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AccountAdjustmentInput["type"]>("debit");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentReference, setAdjustmentReference] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const history = useMemo(() => detail?.movements ?? [], [detail?.movements]);

  const resetAdjustmentForm = (): void => {
    setAdjustmentOpen(false);
    setAdjustmentType("debit");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentReference("");
  };

  const resetApprovalForm = (): void => {
    setApprovalOpen(false);
    setApprovalReason("");
  };

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando cuenta corriente...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la cuenta" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Cuenta no encontrada" description="El cliente solicitado no tiene cuenta corriente simulada." />;
  }

  return (
    <ContentLayout>
      <AccountHeader
        title={detail.clientName}
        description={`${detail.clientCode} · ${detail.assignedSellerName ?? "Sin vendedor asignado"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/accounts">Volver</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/clients/${detail.clientId}`}>Ficha del cliente</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAdjustmentOpen((current) => !current);
            setApprovalOpen(false);
          }}
          disabled={submittingAdjustment || submittingApproval}
        >
          Registrar ajuste simulado
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setApprovalOpen((current) => !current);
            setAdjustmentOpen(false);
          }}
          disabled={submittingAdjustment || submittingApproval}
        >
          Solicitar autorización
        </Button>
      </div>

      {adjustmentOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar ajuste simulado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">Tipo de ajuste</span>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as AccountAdjustmentInput["type"])}>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">Importe</span>
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm"
                type="number"
                min="0"
                step="0.01"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Motivo</span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="Motivo del ajuste"
              />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Referencia opcional</span>
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={adjustmentReference}
                onChange={(event) => setAdjustmentReference(event.target.value)}
                placeholder="Ej. Remito, nota interna o documento comercial"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button
                type="button"
                disabled={submittingAdjustment}
                onClick={() => {
                  void (async () => {
                    const amount = Number(adjustmentAmount);
                    const trimmedReason = adjustmentReason.trim();

                    if (trimmedReason.length === 0) {
                      setFeedback("El motivo del ajuste no puede estar vacío.");
                      return;
                    }

                    if (!Number.isFinite(amount) || amount <= 0) {
                      setFeedback("El importe del ajuste debe ser mayor que cero.");
                      return;
                    }

                    setSubmittingAdjustment(true);
                    try {
                      const result = await createMockAdjustment({
                        type: adjustmentType,
                        amount,
                        description: trimmedReason,
                        ...(adjustmentReference.trim().length > 0 ? { reference: adjustmentReference.trim() } : {}),
                      });
                      setFeedback(`Se registró ${result.movement.documentNumber}.`);
                      resetAdjustmentForm();
                      await refresh();
                    } catch (actionError) {
                      setFeedback(actionError instanceof Error ? actionError.message : "No se pudo generar el ajuste.");
                    } finally {
                      setSubmittingAdjustment(false);
                    }
                  })().catch(() => undefined);
                }}
              >
                Confirmar ajuste
              </Button>
              <Button type="button" variant="outline" onClick={resetAdjustmentForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {approvalOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitar autorización</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">Motivo</span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                value={approvalReason}
                onChange={(event) => setApprovalReason(event.target.value)}
                placeholder="Motivo de la solicitud de autorización"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={submittingApproval}
                onClick={() => {
                  void (async () => {
                    const trimmedReason = approvalReason.trim();
                    if (trimmedReason.length === 0) {
                      setFeedback("El motivo de la autorización no puede estar vacío.");
                      return;
                    }

                    setSubmittingApproval(true);
                    try {
                      const result = await requestDebtApproval(trimmedReason);
                      setFeedback(`Se creó ${result.detail.approvalNumber ?? "la autorización"}.`);
                      resetApprovalForm();
                      await refresh();
                    } catch (actionError) {
                      setFeedback(actionError instanceof Error ? actionError.message : "No se pudo solicitar autorización.");
                    } finally {
                      setSubmittingApproval(false);
                    }
                  })().catch(() => undefined);
                }}
              >
                Confirmar solicitud
              </Button>
              <Button type="button" variant="outline" onClick={resetApprovalForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {feedback && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent>
        </Card>
      )}

      <AccountAlertBanner detail={detail} />

      {detail.approvalRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Autorización vinculada</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p><span className="text-muted-foreground">Número:</span> {detail.approvalNumber ?? "Sin número"}</p>
            <p><span className="text-muted-foreground">Estado:</span> {detail.approvalStatus ? getApprovalStatusLabel(detail.approvalStatus) : getApprovalStatusLabel(detail.approvalRequest.status)}</p>
            <p><span className="text-muted-foreground">Tipo:</span> {detail.approvalType ? getApprovalTypeLabel(detail.approvalType) : getApprovalTypeLabel(detail.approvalRequest.type)}</p>
            <p><span className="text-muted-foreground">Motivo:</span> {detail.approvalRequest.reason}</p>
            <p><span className="text-muted-foreground">Actualizado:</span> {formatCommercialDateTime(detail.lastUpdatedAt)}</p>
            <div className="pt-1">
              <Button asChild variant="outline">
                <Link to={`/approvals/${detail.approvalRequest.id}`}>Abrir autorización</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AccountSummaryPanels detail={detail} />

      <AccountMovementTable movements={history} />

      <AccountOverdueDocuments documents={detail.overdueDocuments} />
    </ContentLayout>
  );
}
