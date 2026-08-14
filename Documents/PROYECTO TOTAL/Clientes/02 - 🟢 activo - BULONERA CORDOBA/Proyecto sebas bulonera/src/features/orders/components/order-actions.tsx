import { Button } from "@/components/ui/button";
import type { OrderCapabilities, OrderDetailData } from "../types";

export function OrderActions({
  detail,
  capabilities,
  onEdit,
  onDuplicate,
  onApprove,
  onCancel,
  onPrepare,
  onMarkReady,
  onDispatch,
  onSyncTango,
}: {
  readonly detail: OrderDetailData;
  readonly capabilities: OrderCapabilities;
  readonly onEdit?: () => void;
  readonly onDuplicate?: () => void;
  readonly onApprove?: () => void;
  readonly onCancel?: () => void;
  readonly onPrepare?: () => void;
  readonly onMarkReady?: () => void;
  readonly onDispatch?: () => void;
  readonly onSyncTango?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {onDuplicate && capabilities.canDuplicate && (
        <Button type="button" variant="outline" onClick={onDuplicate}>
          Duplicar
        </Button>
      )}
      {onEdit && (capabilities.canEdit || capabilities.canEditOwn) && detail.order.status !== "cancelled" && (
        <Button type="button" variant="outline" onClick={onEdit}>
          Editar
        </Button>
      )}
      {onApprove && capabilities.canApprove && detail.order.status === "pendingApproval" && (
        <Button type="button" variant="outline" onClick={onApprove}>
          Aprobar
        </Button>
      )}
      {onCancel && capabilities.canCancel && detail.order.status !== "cancelled" && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      )}
      {onPrepare && capabilities.canPrepare && detail.order.status === "approved" && (
        <Button type="button" variant="outline" onClick={onPrepare}>
          Preparar
        </Button>
      )}
      {onMarkReady && capabilities.canPrepare && detail.order.status === "preparing" && (
        <Button type="button" variant="outline" onClick={onMarkReady}>
          Marcar listo
        </Button>
      )}
      {onDispatch && capabilities.canDispatch && detail.order.status === "readyForDispatch" && (
        <Button type="button" variant="outline" onClick={onDispatch}>
          Enviar a despacho
        </Button>
      )}
      {onSyncTango && capabilities.canSyncTango && detail.order.status === "approved" && (
        <Button type="button" variant="outline" onClick={onSyncTango}>
          Enviar a Tango
        </Button>
      )}
    </div>
  );
}
