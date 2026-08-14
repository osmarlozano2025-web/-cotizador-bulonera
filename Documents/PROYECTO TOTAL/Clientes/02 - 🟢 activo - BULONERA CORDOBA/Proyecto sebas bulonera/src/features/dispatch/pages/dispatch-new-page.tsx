import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import type { OrderId } from "@/domain/shared";
import { DispatchGuideForm } from "../components/dispatch-guide-form";
import { useCreateDispatchGuide } from "../hooks/use-dispatch";
import { getDispatchReferenceData } from "../services/dispatch-service";
import type { DispatchGuideFormValues } from "../types";
import { useOperationalOrder } from "@/features/logistics/hooks/use-logistics";

const INITIAL_VALUES: DispatchGuideFormValues = {
  driverId: "",
  vehicleId: "",
  zoneId: "",
  scheduledDate: "",
  scheduledTimeRange: "",
  observations: "",
};

export function DispatchNewPage(): React.JSX.Element {
  const { orderId: orderIdParam } = useParams();
  const orderId = orderIdParam as OrderId | undefined;
  const navigate = useNavigate();
  const { detail, loading, error } = useOperationalOrder(orderId);
  const { createDispatchGuide } = useCreateDispatchGuide();
  const [values, setValues] = useState<DispatchGuideFormValues>(INITIAL_VALUES);
  const [feedback, setFeedback] = useState<string | null>(null);
  const referenceData = getDispatchReferenceData();

  if (loading) {
    return <ContentLayout><Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando pedido...</CardContent></Card></ContentLayout>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el pedido" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Pedido no encontrado" description="No existe un pedido operativo para crear la guía." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={`Nueva guía para ${detail.orderNumber}`}
        description={`${detail.clientName} · ${detail.locality}`}
        actions={(
          <Button variant="outline" asChild>
            <Link to="/dispatch">Volver</Link>
          </Button>
        )}
      />

      {feedback && <Card><CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent></Card>}

      <DispatchGuideForm
        values={values}
        referenceData={referenceData}
        onChange={setValues}
        submitLabel="Crear guía"
        onSubmit={() => {
          void createDispatchGuide(detail.orderId, values).then((result) => {
            setFeedback(`Guía creada: ${result.guide.number}`);
            void navigate(`/dispatch/${result.dispatchGuideId}`);
          }).catch((actionError) => {
            setFeedback(actionError instanceof Error ? actionError.message : "No se pudo crear la guía.");
          });
        }}
      />
    </ContentLayout>
  );
}
