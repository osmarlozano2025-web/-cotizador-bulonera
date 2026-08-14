import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DispatchGuideDetail, DispatchReferenceData, DispatchGuideFormValues } from "../types";

interface DispatchAssignmentPanelProps {
  readonly detail: DispatchGuideDetail;
  readonly referenceData: DispatchReferenceData;
  readonly formValues: DispatchGuideFormValues;
  readonly onChange: (next: DispatchGuideFormValues) => void;
  readonly onSchedule: () => void;
  readonly saving?: boolean;
}

function selectClassName(): string {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
}

export function DispatchAssignmentPanel({ detail, referenceData, formValues, onChange, onSchedule, saving }: DispatchAssignmentPanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignación de reparto</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <select className={selectClassName()} value={formValues.driverId} onChange={(event) => onChange({ ...formValues, driverId: event.target.value })}>
          <option value="">Seleccionar repartidor</option>
          {referenceData.driverOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select className={selectClassName()} value={formValues.vehicleId} onChange={(event) => onChange({ ...formValues, vehicleId: event.target.value })}>
          <option value="">Seleccionar vehículo</option>
          {referenceData.vehicleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select className={selectClassName()} value={formValues.zoneId} onChange={(event) => onChange({ ...formValues, zoneId: event.target.value })}>
          <option value="">Seleccionar zona</option>
          {referenceData.zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <input
          type="date"
          className={selectClassName()}
          value={formValues.scheduledDate}
          onChange={(event) => onChange({ ...formValues, scheduledDate: event.target.value })}
        />
        <input
          type="text"
          className={selectClassName()}
          value={formValues.scheduledTimeRange}
          onChange={(event) => onChange({ ...formValues, scheduledTimeRange: event.target.value })}
          placeholder="Franja horaria"
        />
        <input
          type="text"
          className={selectClassName()}
          value={formValues.observations}
          onChange={(event) => onChange({ ...formValues, observations: event.target.value })}
          placeholder="Observaciones"
        />
        <div className="md:col-span-2 flex justify-end">
          <Button type="button" onClick={onSchedule} disabled={saving === true}>Guardar asignación</Button>
        </div>
        <div className="md:col-span-2 text-sm text-muted-foreground">
          {detail.driverName ? <p>Repartidor actual: {detail.driverName}</p> : null}
          {detail.vehicleCode ? <p>Vehículo actual: {detail.vehicleCode}</p> : null}
          {detail.zoneName ? <p>Zona actual: {detail.zoneName}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
