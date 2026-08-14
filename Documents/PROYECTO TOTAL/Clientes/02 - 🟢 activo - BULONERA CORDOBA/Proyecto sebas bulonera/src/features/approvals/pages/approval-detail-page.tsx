import { Link, useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import type { AuthorizationRequestId } from "@/domain/shared";
import { ApprovalActions } from "../components/approval-actions";
import { ApprovalDetailPanel } from "../components/approval-detail-panel";
import { ApprovalObservationForm } from "../components/approval-observation-form";
import { ApprovalTimeline } from "../components/approval-timeline";
import { useApproval, useApprovalActions } from "../hooks/use-approvals";

export function ApprovalDetailPage(): React.JSX.Element {
  const { approvalId: approvalIdParam } = useParams();
  const approvalId = approvalIdParam as AuthorizationRequestId | undefined;
  const location = useLocation();
  const { detail, loading, error, refresh, capabilities } = useApproval(approvalId);
  const { approveApproval, rejectApproval, cancelApproval, addObservation } = useApprovalActions();
  const [observation, setObservation] = useState("");
  const [feedback, setFeedback] = useState<string | null>(() => {
    const state = location.state as { flashMessage?: string } | null;
    return typeof state?.flashMessage === "string" ? state.flashMessage : null;
  });
  const history = useMemo(() => detail?.history ?? [], [detail?.history]);
  const observations = useMemo(() => detail?.observations ?? [], [detail?.observations]);
  const trimmedObservation = observation.trim();

  useEffect(() => {
    if (feedback === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      setFeedback(null);
    }, 2800);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [feedback]);

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando autorización...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la autorización" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Autorización no encontrada" description="El registro solicitado no está disponible en la carga simulada." />;
  }

  return (
    <ContentLayout>
      {feedback && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg">
          {feedback}
        </div>
      )}

      <PageHeader
        title={detail.number}
        description={`${detail.typeLabel} · ${detail.clientName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to={`/approvals${location.search}`}>Volver</Link></Button>
            {detail.relatedRoute && <Button variant="outline" asChild><Link to={detail.relatedRoute}>Ir al origen</Link></Button>}
          </div>
        }
      />

      <ApprovalDetailPanel detail={detail} />

      <ApprovalActions
        detail={detail}
        capabilities={capabilities}
        onApprove={() => {
          void (async () => {
            await approveApproval(detail.request.id);
            setFeedback("Autorización aprobada correctamente.");
            await refresh();
          })().catch(() => undefined);
        }}
        onReject={() => {
          void (async () => {
            await rejectApproval(detail.request.id);
            setFeedback("Autorización rechazada correctamente.");
            await refresh();
          })().catch(() => undefined);
        }}
        onCancel={() => {
          void (async () => {
            await cancelApproval(detail.request.id);
            setFeedback("Autorización cancelada correctamente.");
            await refresh();
          })().catch(() => undefined);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Observaciones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ApprovalObservationForm
            value={observation}
            onChange={setObservation}
            canSubmit={trimmedObservation.length > 0}
            onSubmit={() => {
              void (async () => {
                if (trimmedObservation.length === 0) {
                  return;
                }

                await addObservation(detail.request.id, trimmedObservation);
                setObservation("");
                setFeedback("Observación agregada correctamente.");
                await refresh();
              })().catch(() => undefined);
            }}
          />
          <div className="grid gap-3">
            {observations.length === 0 ? (
              <EmptyState title="No hay observaciones." description="Todavía no se agregaron observaciones a esta autorización." />
            ) : (
              observations.map((note, index) => (
                <div key={`${detail.request.id}-observation-${index}`} className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">{note}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ApprovalTimeline entries={history} />
    </ContentLayout>
  );
}
