import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import type { OrderId } from "@/domain/shared";
import { ApprovalBanner } from "../components/approval-banner";
import { CreditWarning } from "../components/credit-warning";
import { OrderActions } from "../components/order-actions";
import { OrderItemsTable } from "../components/order-items-table";
import { OrderSummary } from "../components/order-summary";
import { OrderTotals } from "../components/order-totals";
import { useApproveOrder, useCancelOrder, useDuplicateOrder, useOrder, useOrderStatusActions } from "../hooks/use-orders";
import { ApprovalStatusBadge } from "@/features/approvals/components/approval-status-badge";
import { useApprovalByOrderId } from "@/features/approvals/hooks/use-approvals";
import { getDispatchGuideByOrderId } from "@/features/dispatch/services/dispatch-service";

export function OrderDetailPage(): React.JSX.Element {
  const { orderId: orderIdParam } = useParams();
  const orderId = orderIdParam as OrderId | undefined;
  const navigate = useNavigate();
  const { detail, loading, error, refresh, capabilities } = useOrder(orderId);
  const { detail: approvalDetail } = useApprovalByOrderId(orderId);
  const { duplicateOrder } = useDuplicateOrder();
  const { approveOrder } = useApproveOrder();
  const { cancelOrder } = useCancelOrder();
  const { transitionOrderStatus, syncOrderToTango } = useOrderStatusActions();
  const [dispatchGuideNumber, setDispatchGuideNumber] = useState<string | null>(null);
  const [dispatchGuideId, setDispatchGuideId] = useState<string | null>(null);

  const history = useMemo(() => detail?.history ?? [], [detail?.history]);

  useEffect(() => {
    if (detail === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      void getDispatchGuideByOrderId(detail.order.id).then((guide) => {
        setDispatchGuideNumber(guide?.number ?? null);
        setDispatchGuideId(guide?.id ?? null);
      }).catch(() => {
        setDispatchGuideNumber(null);
        setDispatchGuideId(null);
      });
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [detail]);

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando pedido...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el pedido" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Pedido no encontrado" description="El registro solicitado no está disponible en la simulación actual." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={detail.order.number}
        description={`${detail.clientName} · ${detail.sellerName ?? "Sin vendedor asignado"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/orders">Volver</Link>
            </Button>
          </div>
        }
      />

      <OrderActions
        detail={detail}
        capabilities={capabilities}
        onEdit={() => {
          void navigate(`/orders/${detail.order.id}/edit`);
        }}
        onDuplicate={() => {
          void (async () => {
            const duplicated = await duplicateOrder(detail.order.id);
            void navigate(`/orders/${duplicated.id}`);
          })().catch(() => undefined);
        }}
        onApprove={() => {
          void (async () => {
            await approveOrder(detail.order.id);
            await refresh();
          })().catch(() => undefined);
        }}
        onCancel={() => {
          void (async () => {
            const shouldCancel = globalThis.confirm("¿Querés cancelar este pedido?");
            if (!shouldCancel) {
              return;
            }

            await cancelOrder(detail.order.id);
            await refresh();
          })().catch(() => undefined);
        }}
        onPrepare={() => {
          void (async () => {
            await transitionOrderStatus(detail.order.id, "preparing");
            await refresh();
          })().catch(() => undefined);
        }}
        onMarkReady={() => {
          void (async () => {
            await transitionOrderStatus(detail.order.id, "readyForDispatch");
            await refresh();
          })().catch(() => undefined);
        }}
        onDispatch={() => {
          void (async () => {
            await transitionOrderStatus(detail.order.id, "dispatched");
            await refresh();
          })().catch(() => undefined);
        }}
        onSyncTango={() => {
          void (async () => {
            await syncOrderToTango(detail.order.id);
            await refresh();
          })().catch(() => undefined);
        }}
      />

      <ApprovalBanner detail={detail} />
      {approvalDetail && (
        <Card>
          <CardHeader>
            <CardTitle>Autorización vinculada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <ApprovalStatusBadge status={approvalDetail.request.status} />
            <span className="text-muted-foreground">{approvalDetail.number}</span>
            <span className="text-muted-foreground">{approvalDetail.relatedLabel ?? "Sin referencia"}</span>
            {approvalDetail.relatedRoute && <Link className="text-primary underline-offset-4 hover:underline" to={approvalDetail.relatedRoute}>Abrir autorización</Link>}
          </CardContent>
        </Card>
      )}
      <CreditWarning detail={detail} />
      <Card>
        <CardHeader>
          <CardTitle>Logística vinculada</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p><span className="text-muted-foreground">Guía:</span> {dispatchGuideNumber ?? "Sin guía"}</p>
          <p><span className="text-muted-foreground">Despacho:</span> {detail.dispatch.label}</p>
          <p><span className="text-muted-foreground">Tango:</span> {detail.tango.label}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/logistics/orders/${detail.order.id}`}>Abrir logística</Link>
            </Button>
            {dispatchGuideId && (
              <Button variant="outline" asChild>
                <Link to={`/dispatch/${dispatchGuideId}`}>Abrir guía</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <OrderSummary detail={detail} />
      <OrderItemsTable
        items={detail.order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
          notes: "",
        }))}
      />
      <OrderTotals totals={detail.totals} />

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {history.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <span className="text-xs text-muted-foreground">{formatCommercialDateTime(entry.date)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
