import type { AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";
import { StatusBadge } from "@/components/common/status-badge";
import { getApprovalStatusLabel, getApprovalTypeLabel } from "../utils/approval-labels";

const STATUS_CLASS: Record<AuthorizationRequestStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700",
};

export function ApprovalStatusBadge({ status }: { readonly status: AuthorizationRequestStatus }): React.JSX.Element {
  return <StatusBadge label={getApprovalStatusLabel(status)} className={STATUS_CLASS[status]} />;
}

export function ApprovalTypeBadge({ type }: { readonly type: AuthorizationRequestType }): React.JSX.Element {
  return <StatusBadge label={getApprovalTypeLabel(type)} className="bg-muted text-muted-foreground" />;
}

