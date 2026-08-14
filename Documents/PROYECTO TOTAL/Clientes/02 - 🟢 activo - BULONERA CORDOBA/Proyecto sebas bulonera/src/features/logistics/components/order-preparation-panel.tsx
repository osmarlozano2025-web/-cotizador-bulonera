import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogisticsPreparationItem, LogisticsOrderDetail } from "../types";
import { calculatePreparedPercentage } from "../utils/logistics-rules";
import { MissingItemsPanel } from "./missing-items-panel";
import { PreparationItemRow } from "./preparation-item-row";

interface OrderPreparationPanelProps {
  readonly detail: LogisticsOrderDetail;
  readonly onPreparedChange: (itemId: string, value: number) => void;
  readonly onMarkMissing: (item: LogisticsPreparationItem) => void;
  readonly onStartPreparation: () => void;
  readonly onCompletePreparation: () => void;
  readonly onMarkReadyForDispatch: () => void;
  readonly onRegisterMissing: () => void;
}

export function OrderPreparationPanel({
  detail,
  onPreparedChange,
  onMarkMissing,
  onStartPreparation,
  onCompletePreparation,
  onMarkReadyForDispatch,
  onRegisterMissing,
}: OrderPreparationPanelProps): React.JSX.Element {
  const preparedPercentage = calculatePreparedPercentage(detail.items);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Preparación del pedido</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onStartPreparation}>Iniciar preparación</Button>
            <Button type="button" variant="outline" onClick={onCompletePreparation}>Cerrar preparación</Button>
            <Button type="button" onClick={onMarkReadyForDispatch}>Listo para despacho</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">Avance de preparación: {preparedPercentage}%</p>
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Solicitada</th>
                  <th className="px-4 py-3">Preparada</th>
                  <th className="px-4 py-3">Faltante</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <PreparationItemRow key={item.id} item={item} onPreparedChange={onPreparedChange} onMarkMissing={onMarkMissing} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <MissingItemsPanel items={detail.missingItems} onRegister={onRegisterMissing} />
    </div>
  );
}
