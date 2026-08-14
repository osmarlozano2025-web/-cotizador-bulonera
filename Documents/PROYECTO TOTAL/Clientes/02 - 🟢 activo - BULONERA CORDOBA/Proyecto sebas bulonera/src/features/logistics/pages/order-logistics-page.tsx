import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import type { OrderId, UserId } from "@/domain/shared";
import { DeliveryStatusBadge } from "../components/delivery-status-badge";
import { DispatchStatusBadge } from "../components/dispatch-status-badge";
import { LogisticsHistory } from "../components/logistics-history";
import { LogisticsEmptyState } from "../components/logistics-empty-state";
import { OrderPreparationPanel } from "../components/order-preparation-panel";
import { PreparationStatusBadge } from "../components/preparation-status-badge";
import { useCompleteOrderPreparation, useLogisticsHistory, useMarkReadyForDispatch, useOperationalOrder, useRegisterMissingItem, useStartOrderPreparation, useUpdatePreparedQuantity } from "../hooks/use-logistics";
import type { LogisticsPreparationItem, MissingItemReason } from "../types";

export function OrderLogisticsPage(): React.JSX.Element {
  const { orderId: orderIdParam } = useParams();
  const orderId = orderIdParam as OrderId | undefined;
  const { detail, loading, error, refresh } = useOperationalOrder(orderId);
  const { history } = useLogisticsHistory(orderId);
  const { startOrderPreparation } = useStartOrderPreparation();
  const { updatePreparedQuantity } = useUpdatePreparedQuantity();
  const { registerMissingItem } = useRegisterMissingItem();
  const { completeOrderPreparation } = useCompleteOrderPreparation();
  const { markOrderReadyForDispatch } = useMarkReadyForDispatch();
  const [selectedMissingItem, setSelectedMissingItem] = useState<LogisticsPreparationItem | null>(null);
  const [missingFormOpen, setMissingFormOpen] = useState(false);
  const [missingQuantity, setMissingQuantity] = useState("1");
  const [missingReason, setMissingReason] = useState<MissingItemReason>("outOfStock");
  const [missingNotes, setMissingNotes] = useState("");
  const [submittingMissing, setSubmittingMissing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const guide = detail?.guide ?? null;
  const guideRoute = guide ? `/dispatch/${guide.id}` : null;
  const availableMissingItems = useMemo(() => detail?.items.filter((item) => item.missingQuantity > 0) ?? [], [detail?.items]);
  const missingItemOptions = useMemo(() => detail?.items ?? [], [detail?.items]);
  const selectedMissingItemId = selectedMissingItem?.id ?? availableMissingItems[0]?.id ?? detail?.items[0]?.id ?? "";
  const selectedFormItem = useMemo(() => detail?.items.find((item) => item.id === selectedMissingItemId) ?? null, [detail?.items, selectedMissingItemId]);

  useEffect(() => {
    if (detail === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      setSelectedMissingItem((current) => {
        if (current !== null && detail.items.some((item) => item.id === current.id)) {
          return current;
        }

        return detail.items.find((item) => item.missingQuantity > 0) ?? detail.items[0] ?? null;
      });
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [detail]);

  const closeMissingForm = (): void => {
    setMissingFormOpen(false);
    setMissingNotes("");
    setMissingReason("outOfStock");
    setMissingQuantity("1");
  };

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando pedido operativo...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar la logística" description={error} />;
  }

  if (detail === null) {
    return <LogisticsEmptyState title="Pedido no encontrado" description="El pedido solicitado no está disponible en el circuito operativo." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={detail.orderNumber}
        description={`${detail.clientName} · ${detail.locality} · ${detail.sellerName ?? "Sin vendedor"}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to="/logistics">Volver</Link></Button>
            {guideRoute && <Button variant="outline" asChild><Link to={guideRoute}>Abrir guía</Link></Button>}
          </div>
        )}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado pedido</p><p className="mt-1 text-sm font-medium">{detail.order.status}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Preparación</p><div className="mt-1"><PreparationStatusBadge status={detail.preparationStatus} /></div></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Despacho</p><div className="mt-1"><DispatchStatusBadge status={detail.dispatchStatus} /></div></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Entrega</p><div className="mt-1"><DeliveryStatusBadge status={detail.deliveryStatus} /></div></div>
        </CardContent>
      </Card>

      {feedback && <Card><CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent></Card>}

      {missingFormOpen && selectedFormItem && (
        <Card>
          <CardHeader><CardTitle>Registrar faltante</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Ítem afectado</span>
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={selectedFormItem.id}
                onChange={(event) => {
                  const nextItem = detail.items.find((item) => item.id === event.target.value) ?? null;
                  setSelectedMissingItem(nextItem);
                  setMissingQuantity(nextItem?.missingQuantity !== undefined && nextItem.missingQuantity > 0 ? String(nextItem.missingQuantity) : "1");
                }}
              >
                {missingItemOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.description}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-muted-foreground md:col-span-2">
              Solicitado: {selectedFormItem.requestedQuantity} · Preparado: {selectedFormItem.preparedQuantity} · Pendiente: {selectedFormItem.missingQuantity}
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">Cantidad faltante</span>
              <input
                className="h-10 rounded-md border px-3 text-sm"
                type="number"
                min="1"
                max={selectedFormItem.missingQuantity}
                step="1"
                value={missingQuantity}
                onChange={(event) => setMissingQuantity(event.target.value)}
              />
            </label>
            <select className="h-10 rounded-md border px-3 text-sm" value={missingReason} onChange={(event) => setMissingReason(event.target.value as MissingItemReason)}>
              <option value="outOfStock">Sin stock</option>
              <option value="damaged">Mercadería dañada</option>
              <option value="incorrectProduct">Producto incorrecto</option>
              <option value="locationNotFound">Ubicación no encontrada</option>
              <option value="pendingReplenishment">Reposición pendiente</option>
              <option value="other">Otro</option>
            </select>
            <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" value={missingNotes} onChange={(event) => setMissingNotes(event.target.value)} placeholder="Observaciones" />
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeMissingForm}>Cancelar</Button>
              <Button
                type="button"
                disabled={submittingMissing}
                onClick={() => {
                  void (async () => {
                    const trimmedNotes = missingNotes.trim();
                    const quantity = Number(missingQuantity);

                    if (!Number.isFinite(quantity) || quantity <= 0) {
                      setFeedback("La cantidad faltante debe ser mayor que cero.");
                      return;
                    }

                    if (quantity > selectedFormItem.missingQuantity) {
                      setFeedback("La cantidad faltante no puede superar la pendiente.");
                      return;
                    }

                    setSubmittingMissing(true);
                    try {
                      await registerMissingItem(detail.orderId, {
                        productId: selectedFormItem.productId,
                        productCode: selectedFormItem.code,
                        productDescription: selectedFormItem.description,
                        requestedQuantity: selectedFormItem.requestedQuantity,
                        preparedQuantity: selectedFormItem.preparedQuantity,
                        missingQuantity: quantity,
                        reason: missingReason,
                        ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
                        reportedBy: "user-logistics-1" as UserId,
                        resolutionStatus: "pending",
                      });
                      setFeedback("Faltante registrado correctamente.");
                      closeMissingForm();
                      await refresh();
                    } catch (actionError) {
                      setFeedback(actionError instanceof Error ? actionError.message : "No se pudo registrar el faltante.");
                    } finally {
                      setSubmittingMissing(false);
                    }
                  })().catch(() => undefined);
                }}
              >
                Guardar faltante
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <OrderPreparationPanel
        detail={detail}
        onPreparedChange={(itemId, value) => {
          void updatePreparedQuantity(detail.orderId, itemId, value).then(refresh).catch((actionError) => {
            setFeedback(actionError instanceof Error ? actionError.message : "No se pudo actualizar la cantidad.");
          });
        }}
        onMarkMissing={(item) => {
          setSelectedMissingItem(item);
          setMissingQuantity(item.missingQuantity > 0 ? String(item.missingQuantity) : "1");
          setMissingFormOpen(true);
        }}
        onStartPreparation={() => {
          void startOrderPreparation(detail.orderId).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo iniciar la preparación."));
        }}
        onCompletePreparation={() => {
          void completeOrderPreparation(detail.orderId).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo cerrar la preparación."));
        }}
        onMarkReadyForDispatch={() => {
          void markOrderReadyForDispatch(detail.orderId).then(refresh).catch((actionError) => setFeedback(actionError instanceof Error ? actionError.message : "No se pudo habilitar el despacho."));
        }}
        onRegisterMissing={() => {
          setMissingFormOpen(true);
          setSelectedMissingItem((current) => {
            const nextItem = current ?? detail.items.find((item) => item.missingQuantity > 0) ?? detail.items[0] ?? null;
            setMissingQuantity(nextItem?.missingQuantity !== undefined && nextItem.missingQuantity > 0 ? String(nextItem.missingQuantity) : "1");
            return nextItem;
          });
        }}
      />

      <Card>
        <CardHeader><CardTitle>Guía de despacho</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p><span className="text-muted-foreground">Número:</span> {guide?.number ?? "Sin guía"}</p>
          <p><span className="text-muted-foreground">Repartidor:</span> {guide?.driverName ?? "Sin repartidor"}</p>
          <p><span className="text-muted-foreground">Vehículo:</span> {guide?.vehicle ?? "Sin vehículo"}</p>
          <p><span className="text-muted-foreground">Zona:</span> {guide?.zoneName ?? "Sin zona"}</p>
        </CardContent>
      </Card>

      {detail.delivery && (
        <Card>
          <CardHeader><CardTitle>Entrega</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p><span className="text-muted-foreground">Estado:</span> {detail.delivery.status}</p>
            <p><span className="text-muted-foreground">Recibe:</span> {detail.delivery.recipientName ?? "Sin dato"}</p>
            <p><span className="text-muted-foreground">Observaciones:</span> {detail.delivery.notes ?? "—"}</p>
          </CardContent>
        </Card>
      )}

      <LogisticsHistory history={history} />
    </ContentLayout>
  );
}
