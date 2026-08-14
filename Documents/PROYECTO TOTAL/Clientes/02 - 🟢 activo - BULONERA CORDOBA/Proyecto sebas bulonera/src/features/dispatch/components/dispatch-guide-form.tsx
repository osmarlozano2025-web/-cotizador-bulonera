import { Button } from "@/components/ui/button";
import type { DispatchGuideFormValues, DispatchReferenceData } from "../types";

interface DispatchGuideFormProps {
  readonly values: DispatchGuideFormValues;
  readonly referenceData: DispatchReferenceData;
  readonly onChange: (next: DispatchGuideFormValues) => void;
  readonly onSubmit: () => void;
  readonly submitLabel: string;
  readonly saving?: boolean;
}

function selectClassName(): string {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
}

export function DispatchGuideForm({ values, referenceData, onChange, onSubmit, submitLabel, saving }: DispatchGuideFormProps): React.JSX.Element {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
      <select className={selectClassName()} value={values.driverId} onChange={(event) => onChange({ ...values, driverId: event.target.value })}>
        <option value="">Repartidor</option>
        {referenceData.driverOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={values.vehicleId} onChange={(event) => onChange({ ...values, vehicleId: event.target.value })}>
        <option value="">Vehículo</option>
        {referenceData.vehicleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <select className={selectClassName()} value={values.zoneId} onChange={(event) => onChange({ ...values, zoneId: event.target.value })}>
        <option value="">Zona</option>
        {referenceData.zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <input className={selectClassName()} type="date" value={values.scheduledDate} onChange={(event) => onChange({ ...values, scheduledDate: event.target.value })} />
      <input className={selectClassName()} type="text" value={values.scheduledTimeRange} onChange={(event) => onChange({ ...values, scheduledTimeRange: event.target.value })} placeholder="Franja horaria" />
      <input className={selectClassName()} type="text" value={values.observations} onChange={(event) => onChange({ ...values, observations: event.target.value })} placeholder="Observaciones" />
      <div className="md:col-span-2 flex justify-end">
        <Button type="button" onClick={onSubmit} disabled={saving === true}>{submitLabel}</Button>
      </div>
    </div>
  );
}
