import { Card, CardContent } from "@/components/ui/card";
import type { LogisticsSummary } from "../types";

const ITEMS: readonly { key: keyof LogisticsSummary; label: string }[] = [
  { key: "pendingPreparation", label: "Pendientes de preparación" },
  { key: "preparing", label: "En preparación" },
  { key: "withMissingItems", label: "Con faltantes" },
  { key: "readyForDispatch", label: "Listos para despacho" },
  { key: "dispatchedToday", label: "Despachados hoy" },
  { key: "pendingDeliveries", label: "Entregas pendientes" },
];

export function LogisticsSummaryCards({ summary }: { readonly summary: LogisticsSummary }): React.JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ITEMS.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{summary[item.key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

