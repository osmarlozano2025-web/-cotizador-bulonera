import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ContentLayout } from "@/components/common/content-layout";
import { PageHeader } from "@/components/common/page-header";
import type { OrderId } from "@/domain/shared";
import { getOrderReferenceDataService } from "../services/order-service";
import { useOrder, useUpdateOrder } from "../hooks/use-orders";
import { OrderForm } from "../components/order-form";
import type { OrderFormValues } from "../types";
import { mapOrderToFormDefaults } from "../schemas/order-schema";

export function OrderEditPage(): React.JSX.Element {
  const { orderId: orderIdParam } = useParams();
  const orderId = orderIdParam as OrderId | undefined;
  const navigate = useNavigate();
  const referenceData = useMemo(() => getOrderReferenceDataService(), []);
  const { detail, loading, error } = useOrder(orderId);
  const { updateOrder, loading: saving } = useUpdateOrder(orderId);
  const [readyValues, setReadyValues] = useState<OrderFormValues | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (detail !== null) {
      const timer = globalThis.setTimeout(() => {
        setReadyValues(mapOrderToFormDefaults(detail.order, referenceData));
      }, 0);
      return () => {
        globalThis.clearTimeout(timer);
      };
    }
  }, [detail, referenceData]);

  const canRenderForm = useMemo(() => detail !== null && readyValues !== null, [detail, readyValues]);

  if (loading) {
    return <ContentLayout><PageHeader title="Editar pedido" description="Cargando datos del pedido..." /></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el pedido" description={error} />;
  }

  if (!canRenderForm || detail === null || readyValues === null) {
    return <EmptyState title="Pedido no encontrado" description="El registro solicitado no existe en la simulación actual." />;
  }

  const initialSignature = JSON.stringify(readyValues);

  return (
    <ContentLayout>
      <PageHeader title={`Editar ${detail.order.number}`} description="Actualizá los datos operativos del pedido sin perder la trazabilidad." />
      {feedback && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent>
        </Card>
      )}
      {saving && <EmptyState title="Guardando cambios" description="Procesando la actualización..." />}
      <OrderForm
        title="Edición de pedido"
        description="Ajustá el cliente, los ítems y las observaciones del pedido."
        referenceData={referenceData}
        initialValues={readyValues}
        submitLabel="Guardar cambios"
        secondaryAction={(
          <Button type="button" variant="outline" onClick={() => void navigate(`/orders/${detail.order.id}`)}>
            Cancelar edición
          </Button>
        )}
        onSubmit={(values) => {
          if (JSON.stringify(values) === initialSignature) {
            setFeedback("No hay cambios para guardar.");
            return;
          }

          void (async () => {
            const order = await updateOrder(values);
            void navigate(`/orders/${order.id}`);
          })().catch((updateError) => {
            setFeedback(updateError instanceof Error ? updateError.message : "No se pudo guardar el pedido.");
          });
        }}
      />
    </ContentLayout>
  );
}
