import { StatusBadge } from "@/components/common/status-badge";
import type { PreparationStatus } from "../types";
import { getPreparationStatusLabel } from "../utils/logistics-labels";

const TONES: Record<PreparationStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  preparing: "border-amber-200 bg-amber-50 text-amber-700",
  partial: "border-orange-200 bg-orange-50 text-orange-700",
  prepared: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function PreparationStatusBadge({ status }: { readonly status: PreparationStatus }): React.JSX.Element {
  return <StatusBadge label={getPreparationStatusLabel(status)} className={TONES[status]} />;
}
