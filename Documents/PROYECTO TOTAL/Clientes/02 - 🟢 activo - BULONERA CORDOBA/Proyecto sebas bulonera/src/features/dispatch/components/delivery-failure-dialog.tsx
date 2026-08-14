import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DispatchDeliveryFailureValues } from "../types";

interface DeliveryFailureDialogProps {
  readonly value: DispatchDeliveryFailureValues;
  readonly onChange: (next: DispatchDeliveryFailureValues) => void;
  readonly onSubmit: () => void;
}

export function DeliveryFailureDialog({ value, onChange, onSubmit }: DeliveryFailureDialogProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marcar entrega fallida</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <select className="h-10 rounded-md border px-3 text-sm" value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value as DispatchDeliveryFailureValues["reason"] })}>
          <option value="clientAbsent">Cliente ausente</option>
          <option value="incorrectAddress">Dirección incorrecta</option>
          <option value="rejectedDelivery">Entrega rechazada</option>
          <option value="vehicleIssue">Problema del vehículo</option>
          <option value="damagedGoods">Mercadería dañada</option>
          <option value="other">Otro</option>
        </select>
        <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Observaciones" />
        <div className="md:col-span-2 flex justify-end">
          <Button type="button" onClick={onSubmit}>Guardar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

