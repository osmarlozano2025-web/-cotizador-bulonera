import { StatusBadge } from "@/components/common/status-badge";
import type { AccountMovementStatus, AccountMovementType, AccountState } from "../types";
import { getAccountMovementStatusLabel, getAccountMovementTypeLabel, getAccountStateLabel } from "../utils/account-labels";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  neutral: "bg-muted text-muted-foreground ring-border",
};

export function AccountStateBadge({ state }: { readonly state: AccountState }): React.JSX.Element {
  const tone: Tone =
    state === "current" || state === "creditBalance"
      ? "success"
      : state === "underReview"
        ? "warning"
        : "danger";

  return <StatusBadge label={getAccountStateLabel(state)} className={TONE_CLASS[tone]} variant="ring" />;
}

export function AccountMovementTypeBadge({ type }: { readonly type: AccountMovementType }): React.JSX.Element {
  const tone: Tone =
    type === "payment" || type === "creditNote"
      ? "success"
      : type === "invoice" || type === "debitNote"
        ? "warning"
        : "neutral";

  return <StatusBadge label={getAccountMovementTypeLabel(type)} className={TONE_CLASS[tone]} variant="ring" />;
}

export function AccountMovementStatusBadge({ status }: { readonly status: AccountMovementStatus }): React.JSX.Element {
  const tone: Tone =
    status === "paid" || status === "applied"
      ? "success"
      : status === "pending" || status === "partiallyPaid"
        ? "warning"
        : status === "overdue"
          ? "danger"
          : "neutral";

  return <StatusBadge label={getAccountMovementStatusLabel(status)} className={TONE_CLASS[tone]} variant="ring" />;
}
