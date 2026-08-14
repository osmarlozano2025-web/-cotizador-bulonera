import { StatusBadge } from "@/components/common/status-badge";
import type { OrderDispatchStatus } from "../types";
import { getDispatchStatusLabel } from "../utils/order-labels";

const DISPATCH_TONE_CLASS: Record<OrderDispatchStatus, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  preparing: "border-amber-200 bg-amber-50 text-amber-700",
  prepared: "border-sky-200 bg-sky-50 text-sky-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  dispatched: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function OrderDispatchStatusBadge({ status }: { readonly status: OrderDispatchStatus }): React.JSX.Element {
  return <StatusBadge label={getDispatchStatusLabel(status)} className={DISPATCH_TONE_CLASS[status]} />;
}

