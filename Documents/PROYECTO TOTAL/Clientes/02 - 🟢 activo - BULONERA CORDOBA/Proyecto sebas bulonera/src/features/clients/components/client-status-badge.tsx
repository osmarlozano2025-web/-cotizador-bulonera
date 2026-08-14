import type { AccountStatus, ClientCommercialStatus, ClientStatus } from "@/domain/client/types";
import { StatusBadge } from "@/components/common/status-badge";
import { getAccountStatusLabel, getAccountStatusTone, getCommercialStatusLabel, getCommercialStatusTone } from "../utils/client-calculations";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-700",
};

export function ClientCommercialStatusBadge({ status }: { readonly status: ClientCommercialStatus }): React.JSX.Element {
  return <StatusBadge label={getCommercialStatusLabel(status)} className={TONE_CLASS[getCommercialStatusTone(status)]} variant="plain" />;
}

export function ClientAccountStatusBadge({ status }: { readonly status: AccountStatus }): React.JSX.Element {
  return <StatusBadge label={getAccountStatusLabel(status)} className={TONE_CLASS[getAccountStatusTone(status)]} variant="plain" />;
}

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  blocked: "Bloqueado",
  suspended: "Suspendido",
  pendingApproval: "Pendiente de aprobación",
};

const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  active: "success",
  inactive: "neutral",
  blocked: "danger",
  suspended: "warning",
  pendingApproval: "warning",
};

export function ClientStatusBadge({ status }: { readonly status: ClientStatus }): React.JSX.Element {
  return <StatusBadge label={CLIENT_STATUS_LABEL[status]} className={TONE_CLASS[CLIENT_STATUS_TONE[status]]} variant="plain" />;
}
