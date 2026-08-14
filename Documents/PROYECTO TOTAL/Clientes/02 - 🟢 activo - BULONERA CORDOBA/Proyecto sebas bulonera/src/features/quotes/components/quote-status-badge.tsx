import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import type { QuoteStatus } from "@/domain/quote/quote";
import { StatusBadge } from "@/components/common/status-badge";
import { getQuoteStatusLabel, getQuoteStatusTone } from "../utils/quote-labels";

const TONE_CLASS: Record<ReturnType<typeof getQuoteStatusTone>, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

export function QuoteStatusBadge({ status }: { readonly status: QuoteStatus }): React.JSX.Element {
  return <StatusBadge label={getQuoteStatusLabel(status)} className={TONE_CLASS[getQuoteStatusTone(status)]} />;
}

const AUTHORIZATION_CLASS: Record<AuthorizationRequestStatus | "none" | "loading", string> = {
  loading: "border-slate-200 bg-slate-50 text-slate-500",
  none: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700",
};

export function QuoteAuthorizationBadge({ status }: { readonly status?: AuthorizationRequestStatus | null }): React.JSX.Element {
  const nextStatus: AuthorizationRequestStatus | "none" | "loading" = status === undefined ? "loading" : status ?? "none";
  const labels: Record<AuthorizationRequestStatus | "none" | "loading", string> = {
    loading: "Cargando autorización...",
    none: "Sin autorización",
    pending: "Pendiente de autorización",
    approved: "Autorizada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
  };

  return <StatusBadge label={labels[nextStatus]} className={AUTHORIZATION_CLASS[nextStatus]} />;
}
