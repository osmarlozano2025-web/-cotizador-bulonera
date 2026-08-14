import type { DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import { StatusBadge } from "@/components/common/status-badge";
import { getDispatchGuideStatusLabel } from "../utils/logistics-labels";

const TONES: Record<DispatchGuideStatus | "none", string> = {
  none: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  assigned: "border-cyan-200 bg-cyan-50 text-cyan-700",
  preparing: "border-amber-200 bg-amber-50 text-amber-700",
  ready: "border-blue-200 bg-blue-50 text-blue-700",
  dispatched: "border-indigo-200 bg-indigo-50 text-indigo-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  rescheduled: "border-violet-200 bg-violet-50 text-violet-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

export function DispatchStatusBadge({ status }: { readonly status: DispatchGuideStatus | "none" }): React.JSX.Element {
  return <StatusBadge label={getDispatchGuideStatusLabel(status)} className={TONES[status]} />;
}
