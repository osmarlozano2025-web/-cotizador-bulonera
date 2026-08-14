import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function QuoteSearch({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Buscar por número, cliente, vendedor, producto o estado"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </CardContent>
    </Card>
  );
}
