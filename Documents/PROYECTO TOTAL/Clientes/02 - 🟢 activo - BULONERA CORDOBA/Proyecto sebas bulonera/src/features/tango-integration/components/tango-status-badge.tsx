import { StatusBadge } from "@/components/common/status-badge";
import { getTangoJobStatusLabel, type TangoSyncJobStatus } from "@/integrations/tango";

const STATUS_STYLES: Record<TangoSyncJobStatus, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  processing: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  retrying: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-border bg-muted text-muted-foreground",
  blocked: "border-orange-200 bg-orange-50 text-orange-700",
  notConfigured: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function TangoStatusBadge({ status }: { readonly status: TangoSyncJobStatus }): React.JSX.Element {
  return <StatusBadge label={getTangoJobStatusLabel(status)} className={STATUS_STYLES[status]} />;
}
