export function ProductSearch({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type="search"
      placeholder="Buscar por código, nombre, familia o línea..."
      aria-label="Buscar productos"
      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
    />
  );
}

