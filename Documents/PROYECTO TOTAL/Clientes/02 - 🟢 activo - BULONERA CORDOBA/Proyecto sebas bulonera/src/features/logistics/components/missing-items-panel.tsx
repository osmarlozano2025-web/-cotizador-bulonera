import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LogisticsMissingItem } from "../types";
import { getMissingItemReasonLabel, getMissingItemResolutionLabel } from "../utils/logistics-labels";

interface MissingItemsPanelProps {
  readonly items: readonly LogisticsMissingItem[];
  readonly onRegister: () => void;
}

export function MissingItemsPanel({ items, onRegister }: MissingItemsPanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Faltantes</CardTitle>
        <Button type="button" variant="outline" onClick={onRegister}>Registrar faltante</Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se registraron faltantes.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.productCode}</p>
                <span className="text-xs text-muted-foreground">{getMissingItemResolutionLabel(item.resolutionStatus)}</span>
              </div>
              <p className="text-muted-foreground">{item.productDescription}</p>
              <p className="text-muted-foreground">{getMissingItemReasonLabel(item.reason)}</p>
              <p className="text-muted-foreground">Solicitado: {item.requestedQuantity} · Preparado: {item.preparedQuantity} · Faltante: {item.missingQuantity}</p>
              {item.notes && <p className="text-muted-foreground">{item.notes}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
