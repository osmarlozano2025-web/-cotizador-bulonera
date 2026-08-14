import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DispatchGuideHeader } from "../components/dispatch-guide-header";
import { DispatchGuideItems } from "../components/dispatch-guide-items";
import { DispatchAssignmentPanel } from "../components/dispatch-assignment-panel";
import { DispatchActions } from "../components/dispatch-actions";
import { DeliveryConfirmationDialog } from "../components/delivery-confirmation-dialog";
import { DeliveryFailureDialog } from "../components/delivery-failure-dialog";
import { RescheduleDeliveryDialog } from "../components/reschedule-delivery-dialog";
import { useCancelDispatch, useConfirmDelivery, useDispatchGuide, useDispatchOrder, useMarkDeliveryFailed, useMarkDispatchGuideReady, useRescheduleDelivery, useUpdateDispatchGuide } from "../hooks/use-dispatch";
import { getDispatchReferenceData } from "../services/dispatch-service";
import type { DispatchDeliveryConfirmationValues, DispatchDeliveryFailureValues, DispatchDeliveryRescheduleValues, DispatchGuideFormValues } from "../types";
import { canCancelDispatchGuide, canConfirmDispatchDelivery, canDispatchDispatchGuide, canMarkDispatchGuideReady, canRegisterDispatchFailure, canRescheduleDispatchDelivery, validateDispatchGuideForm } from "../utils/dispatch-rules";

const INITIAL_GUIDE_FORM: DispatchGuideFormValues = {
  driverId: "",
  vehicleId: "",
  zoneId: "",
  scheduledDate: "",
  scheduledTimeRange: "",
  observations: "",
} as const;

export function DispatchDetailPage(): React.JSX.Element {
  const { dispatchGuideId } = useParams();
  const navigate = useNavigate();
  const { detail, loading, error, refresh, history } = useDispatchGuide(dispatchGuideId);
  const { updateDispatchGuide } = useUpdateDispatchGuide();
  const { markDispatchGuideReady } = useMarkDispatchGuideReady();
  const { dispatchOrder } = useDispatchOrder();
  const { confirmDelivery } = useConfirmDelivery();
  const { markDeliveryFailed } = useMarkDeliveryFailed();
  const { rescheduleDelivery } = useRescheduleDelivery();
  const { cancelDispatch } = useCancelDispatch();
  const [formValues, setFormValues] = useState<DispatchGuideFormValues>(INITIAL_GUIDE_FORM);
  const [confirmationValues, setConfirmationValues] = useState<DispatchDeliveryConfirmationValues>({ recipientName: "", recipientDocument: "", notes: "" });
  const [failureValues, setFailureValues] = useState<DispatchDeliveryFailureValues>({ reason: "clientAbsent", notes: "" });
  const [rescheduleValues, setRescheduleValues] = useState<DispatchDeliveryRescheduleValues>({ rescheduledDate: "", notes: "" });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const referenceData = getDispatchReferenceData();

  const items = useMemo(() => detail?.items ?? [], [detail?.items]);
  const canMarkReady = canMarkDispatchGuideReady(detail ?? { status: "pending" });
  const canDispatch = canDispatchDispatchGuide(detail ?? { status: "pending" });
  const canMarkDelivered = canConfirmDispatchDelivery(detail ?? { status: "pending" });
  const canMarkDeliveryFailed = canRegisterDispatchFailure(detail ?? { status: "pending" });
  const canReschedule = canRescheduleDispatchDelivery(detail ?? { status: "pending" });
  const canCancel = canCancelDispatchGuide(detail ?? { status: "pending" });

  useEffect(() => {
    if (detail === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      setFormValues({
        driverId: detail.driverId ?? "",
        vehicleId: detail.vehicleId ?? "",
        zoneId: detail.zoneId ?? "",
        scheduledDate: detail.scheduledDate ?? "",
        scheduledTimeRange: detail.scheduledTimeRange ?? "",
        observations: detail.observations ?? "",
      });
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [detail]);

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando guía...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la guía" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Guía no encontrada" description="La guía solicitada no está disponible en la simulación actual." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={detail.number}
        description={`${detail.clientName} · Pedido ${detail.orderNumber}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to="/dispatch">Volver</Link></Button>
            <Button variant="outline" onClick={() => void navigate(`/dispatch/${detail.id}/edit`)}>Editar</Button>
          </div>
        )}
      />

      <DispatchGuideHeader detail={detail} />

      {feedback && <Card><CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent></Card>}

      <DispatchGuideItems items={items} />

      <DispatchAssignmentPanel
        detail={detail}
        referenceData={referenceData}
        formValues={formValues}
        onChange={setFormValues}
        onSchedule={() => {
          void (async () => {
            const issues = validateDispatchGuideForm(formValues);
            if (issues.length > 0) {
              setFeedback(issues.join(" "));
              return;
            }

            setSavingAssignment(true);
            try {
              await updateDispatchGuide(detail.id, formValues);
              setFeedback("Asignación guardada correctamente.");
              await refresh();
            } catch (actionError) {
              setFeedback(actionError instanceof Error ? actionError.message : "No se pudo guardar la asignación.");
            } finally {
              setSavingAssignment(false);
            }
          })().catch(() => undefined);
        }}
        saving={savingAssignment}
      />

      <DispatchActions
        canMarkReady={canMarkReady}
        canDispatch={canDispatch}
        canMarkDelivered={canMarkDelivered}
        canMarkDeliveryFailed={canMarkDeliveryFailed}
        canReschedule={canReschedule}
        canCancel={canCancel}
        onMarkReady={() => {
          void markDispatchGuideReady(detail.id).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo marcar la guía como lista."));
        }}
        onDispatch={() => {
          void dispatchOrder(detail.id).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo despachar."));
        }}
        onMarkDelivered={() => {
          void confirmDelivery(detail.id, confirmationValues).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo confirmar la entrega."));
        }}
        onMarkDeliveryFailed={() => {
          void markDeliveryFailed(detail.id, failureValues).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo registrar la entrega fallida."));
        }}
        onReschedule={() => {
          void rescheduleDelivery(detail.id, rescheduleValues).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo reprogramar la entrega."));
        }}
        onCancel={() => {
          void (async () => {
            const shouldCancel = globalThis.confirm("¿Querés cancelar esta guía?");
            if (!shouldCancel) {
              return;
            }

            await cancelDispatch(detail.id, "Cancelada por el usuario.");
            await refresh();
          })().catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo cancelar la guía."));
        }}
      />

      {(canMarkDelivered || canMarkDeliveryFailed || canReschedule) && (
        <div className="grid gap-4 xl:grid-cols-3">
          {canMarkDelivered && <DeliveryConfirmationDialog value={confirmationValues} onChange={setConfirmationValues} onConfirm={() => { void confirmDelivery(detail.id, confirmationValues).then(() => refresh()).catch(() => undefined); }} />}
          {canMarkDeliveryFailed && <DeliveryFailureDialog value={failureValues} onChange={setFailureValues} onSubmit={() => { void markDeliveryFailed(detail.id, failureValues).then(() => refresh()).catch(() => undefined); }} />}
          {canReschedule && <RescheduleDeliveryDialog value={rescheduleValues} onChange={setRescheduleValues} onSubmit={() => { void rescheduleDelivery(detail.id, rescheduleValues).then(() => refresh()).catch(() => undefined); }} />}
        </div>
      )}

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Documento operativo interno. No reemplaza remitos ni comprobantes fiscales.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 p-4 text-sm">
          <p><span className="text-muted-foreground">Pedido:</span> {detail.orderNumber}</p>
          <p><span className="text-muted-foreground">Dirección:</span> {detail.address.street} {detail.address.number ?? ""}</p>
          <p><span className="text-muted-foreground">Cliente:</span> <Link className="text-primary underline-offset-4 hover:underline" to={`/clients/${detail.clientId}`}>{detail.clientName}</Link></p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">{history.length === 0 ? "Sin historial" : `Eventos: ${history.length}`}</CardContent>
      </Card>
    </ContentLayout>
  );
}
