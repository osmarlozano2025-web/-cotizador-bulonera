import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DispatchGuideForm } from "../components/dispatch-guide-form";
import { useDispatchGuide, useUpdateDispatchGuide } from "../hooks/use-dispatch";
import { getDispatchReferenceData } from "../services/dispatch-service";
import type { DispatchGuideFormValues } from "../types";
import { validateDispatchGuideForm } from "../utils/dispatch-rules";

export function DispatchEditPage(): React.JSX.Element {
  const { dispatchGuideId } = useParams();
  const navigate = useNavigate();
  const { detail, loading, error, refresh } = useDispatchGuide(dispatchGuideId);
  const { updateDispatchGuide } = useUpdateDispatchGuide();
  const [values, setValues] = useState<DispatchGuideFormValues>({
    driverId: "",
    vehicleId: "",
    zoneId: "",
    scheduledDate: "",
    scheduledTimeRange: "",
    observations: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const referenceData = getDispatchReferenceData();

  useEffect(() => {
    if (detail === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      setValues({
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
    return <EmptyState title="Guía no encontrada" description="La guía solicitada no está disponible." />;
  }

  return (
    <ContentLayout>
      <PageHeader
        title={`Editar ${detail.number}`}
        description={`${detail.clientName} · Pedido ${detail.orderNumber}`}
        actions={(
          <Button variant="outline" asChild>
            <Link to={`/dispatch/${detail.id}`}>Volver</Link>
          </Button>
        )}
      />

      {feedback && <Card><CardContent className="p-4 text-sm text-muted-foreground">{feedback}</CardContent></Card>}

      <DispatchGuideForm
        values={values}
        referenceData={referenceData}
        onChange={setValues}
        submitLabel="Guardar cambios"
        saving={saving}
        onSubmit={() => {
          void (async () => {
            const issues = validateDispatchGuideForm(values);
            if (issues.length > 0) {
              setFeedback(issues.join(" "));
              return;
            }

            setSaving(true);
            try {
              await updateDispatchGuide(detail.id, values);
              setFeedback("Guía actualizada.");
              await refresh();
              void navigate(`/dispatch/${detail.id}`);
            } catch (actionError) {
              setFeedback(actionError instanceof Error ? actionError.message : "No se pudo guardar la guía.");
            } finally {
              setSaving(false);
            }
          })().catch(() => undefined);
        }}
      />
    </ContentLayout>
  );
}
