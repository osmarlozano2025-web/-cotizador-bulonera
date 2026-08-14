import { Button } from "@/components/ui/button";

export function ApprovalObservationForm({
  value,
  onChange,
  onSubmit,
  canSubmit = true,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly canSubmit?: boolean;
}): React.JSX.Element {
  return (
    <div className="grid gap-3">
      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Agregar observación..."
      />
      <div>
        <Button type="button" variant="outline" disabled={!canSubmit} onClick={onSubmit}>Agregar observación</Button>
      </div>
    </div>
  );
}
