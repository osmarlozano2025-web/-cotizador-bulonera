import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import type { ApprovalHistoryEntry } from "../types";

function getTimelineIcon(entry: ApprovalHistoryEntry): string {
  const title = entry.title.toLowerCase();
  if (title.includes("creada")) return "🟢";
  if (title.includes("pendiente")) return "🟡";
  if (title.includes("observación")) return "💬";
  if (title.includes("aprobada")) return "✅";
  if (title.includes("rechazada")) return "❌";
  if (title.includes("cancelada")) return "🚫";
  return "•";
}

export function ApprovalTimeline({ entries }: { readonly entries: readonly ApprovalHistoryEntry[] }): React.JSX.Element {
  const sortedEntries = [...entries].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEntries.length === 0 ? (
          <EmptyState title="No hay eventos registrados." description="Todavía no se registraron cambios en esta autorización." />
        ) : (
          <ol className="space-y-4">
            {sortedEntries.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-sm">{getTimelineIcon(entry)}</div>
                <div className="min-w-0 flex-1 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.title}</p>
                    <span className="text-xs text-muted-foreground">{formatCommercialDateTime(entry.date)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
