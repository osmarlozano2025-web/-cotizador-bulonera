import { Button } from "@/components/ui/button";
import type { ApprovalCapabilities, ApprovalDetailData } from "../types";

export function ApprovalActions({
  detail,
  capabilities,
  onApprove,
  onReject,
  onCancel,
}: {
  readonly detail: ApprovalDetailData;
  readonly capabilities: ApprovalCapabilities;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
  readonly onCancel?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {onApprove && capabilities.canApprove && detail.request.status === "pending" && (
        <Button type="button" onClick={onApprove}>Aprobar</Button>
      )}
      {onReject && capabilities.canReject && detail.request.status === "pending" && (
        <Button type="button" variant="outline" onClick={onReject}>Rechazar</Button>
      )}
      {onCancel && capabilities.canCancel && detail.request.status === "pending" && (
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      )}
    </div>
  );
}

