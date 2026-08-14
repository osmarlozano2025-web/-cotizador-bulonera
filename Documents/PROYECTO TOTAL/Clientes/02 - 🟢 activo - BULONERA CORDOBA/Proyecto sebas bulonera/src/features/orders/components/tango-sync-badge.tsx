import { cn } from "@/lib/cn";
import type { OrderTangoStatus } from "../types";
import { getTangoStatusLabel } from "../utils/order-labels";

const TANGO_TONE_CLASS: Record<OrderTangoStatus, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function TangoSyncBadge({ status }: { readonly status: OrderTangoStatus }): React.JSX.Element {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", TANGO_TONE_CLASS[status])}>
      {getTangoStatusLabel(status)}
    </span>
  );
}

