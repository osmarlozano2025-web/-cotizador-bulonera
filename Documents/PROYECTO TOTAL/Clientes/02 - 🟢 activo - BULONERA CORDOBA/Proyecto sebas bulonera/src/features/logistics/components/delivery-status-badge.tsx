import type { DeliveryStatus } from "@/domain/dispatch/delivery";
import { StatusBadge } from "@/components/common/status-badge";
import { getDeliveryStatusLabel } from "../utils/logistics-labels";

const TONES: Record<DeliveryStatus | "none", string> = {
  none: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  rescheduled: "border-violet-200 bg-violet-50 text-violet-700",
};

export function DeliveryStatusBadge({ status }: { readonly status: DeliveryStatus | "none" }): React.JSX.Element {
  return <StatusBadge label={getDeliveryStatusLabel(status)} className={TONES[status]} />;
}
