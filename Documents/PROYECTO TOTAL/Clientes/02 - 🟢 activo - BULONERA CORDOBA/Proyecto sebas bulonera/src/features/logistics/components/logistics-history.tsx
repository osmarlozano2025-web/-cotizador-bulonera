import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/features/clients/utils/formatters";
import type { LogisticsHistoryEntry } from "../types";

interface LogisticsHistoryProps {
  readonly history: readonly LogisticsHistoryEntry[];
}

export function LogisticsHistory({ history }: LogisticsHistoryProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.date)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

