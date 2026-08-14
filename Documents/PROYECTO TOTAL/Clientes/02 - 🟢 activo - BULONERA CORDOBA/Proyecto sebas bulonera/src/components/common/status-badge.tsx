import { cn } from "@/lib/cn";

export type StatusBadgeVariant = "border" | "ring" | "plain";

const VARIANT_BASE: Record<StatusBadgeVariant, string> = {
  border: "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
  ring: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
  plain: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
};

interface StatusBadgeProps {
  readonly label: string;
  readonly className?: string;
  readonly variant?: StatusBadgeVariant;
}

export function StatusBadge({ label, className, variant = "border" }: StatusBadgeProps): React.JSX.Element {
  return <span className={cn(VARIANT_BASE[variant], className)}>{label}</span>;
}
