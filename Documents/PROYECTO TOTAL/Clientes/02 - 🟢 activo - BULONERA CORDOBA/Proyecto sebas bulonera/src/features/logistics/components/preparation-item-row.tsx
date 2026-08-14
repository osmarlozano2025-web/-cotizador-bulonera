import { Button } from "@/components/ui/button";
import type { LogisticsPreparationItem } from "../types";

interface PreparationItemRowProps {
  readonly item: LogisticsPreparationItem;
  readonly onPreparedChange: (itemId: string, value: number) => void;
  readonly onMarkMissing: (item: LogisticsPreparationItem) => void;
}

export function PreparationItemRow({ item, onPreparedChange, onMarkMissing }: PreparationItemRowProps): React.JSX.Element {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-3 font-medium">{item.code}</td>
      <td className="px-4 py-3">{item.description}</td>
      <td className="px-4 py-3">{item.requestedQuantity}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          max={item.requestedQuantity}
          value={item.preparedQuantity}
          onChange={(event) => onPreparedChange(item.id, Number(event.target.value))}
          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
        />
      </td>
      <td className="px-4 py-3">{item.missingQuantity}</td>
      <td className="px-4 py-3">{item.unitOfMeasure}</td>
      <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
      <td className="px-4 py-3 text-muted-foreground">{item.notes ?? "—"}</td>
      <td className="px-4 py-3">{item.status}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onPreparedChange(item.id, item.requestedQuantity)}>Completo</Button>
          <Button type="button" variant="outline" onClick={() => onMarkMissing(item)}>Faltante</Button>
        </div>
      </td>
    </tr>
  );
}
