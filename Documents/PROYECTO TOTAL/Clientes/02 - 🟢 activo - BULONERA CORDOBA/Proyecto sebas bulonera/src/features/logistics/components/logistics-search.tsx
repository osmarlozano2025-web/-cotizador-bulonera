import type { ChangeEvent } from "react";

interface LogisticsSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function LogisticsSearch({ value, onChange }: LogisticsSearchProps): React.JSX.Element {
  return (
    <input
      type="search"
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder="Buscar por pedido, cliente, vendedor, guía o producto"
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

