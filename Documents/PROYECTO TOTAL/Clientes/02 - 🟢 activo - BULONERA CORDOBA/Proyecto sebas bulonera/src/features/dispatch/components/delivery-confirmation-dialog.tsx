import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DispatchDeliveryConfirmationValues } from "../types";

interface DeliveryConfirmationDialogProps {
  readonly value: DispatchDeliveryConfirmationValues;
  readonly onChange: (next: DispatchDeliveryConfirmationValues) => void;
  readonly onConfirm: () => void;
}

export function DeliveryConfirmationDialog({ value, onChange, onConfirm }: DeliveryConfirmationDialogProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmar entrega</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <input className="h-10 rounded-md border px-3 text-sm" type="text" value={value.recipientName} onChange={(event) => onChange({ ...value, recipientName: event.target.value })} placeholder="Nombre de quien recibe" />
        <input className="h-10 rounded-md border px-3 text-sm" type="text" value={value.recipientDocument} onChange={(event) => onChange({ ...value, recipientDocument: event.target.value })} placeholder="Documento" />
        <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Observaciones" />
        <div className="md:col-span-2 flex justify-end">
          <Button type="button" onClick={onConfirm}>Confirmar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

