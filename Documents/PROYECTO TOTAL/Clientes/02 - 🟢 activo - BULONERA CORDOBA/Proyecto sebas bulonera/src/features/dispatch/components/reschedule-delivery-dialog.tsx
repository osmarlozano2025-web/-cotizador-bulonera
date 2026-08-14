import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DispatchDeliveryRescheduleValues } from "../types";

interface RescheduleDeliveryDialogProps {
  readonly value: DispatchDeliveryRescheduleValues;
  readonly onChange: (next: DispatchDeliveryRescheduleValues) => void;
  readonly onSubmit: () => void;
}

export function RescheduleDeliveryDialog({ value, onChange, onSubmit }: RescheduleDeliveryDialogProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reprogramar entrega</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <input className="h-10 rounded-md border px-3 text-sm" type="date" value={value.rescheduledDate} onChange={(event) => onChange({ ...value, rescheduledDate: event.target.value })} />
        <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Motivo y observaciones" />
        <div className="md:col-span-2 flex justify-end">
          <Button type="button" onClick={onSubmit}>Reprogramar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

