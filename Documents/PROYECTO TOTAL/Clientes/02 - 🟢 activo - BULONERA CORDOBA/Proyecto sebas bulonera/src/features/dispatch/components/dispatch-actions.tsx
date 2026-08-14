import { Button } from "@/components/ui/button";

interface DispatchActionsProps {
  readonly canMarkReady: boolean;
  readonly canDispatch: boolean;
  readonly canMarkDelivered: boolean;
  readonly canMarkDeliveryFailed: boolean;
  readonly canReschedule: boolean;
  readonly canCancel: boolean;
  readonly onMarkReady: () => void;
  readonly onDispatch: () => void;
  readonly onMarkDelivered: () => void;
  readonly onMarkDeliveryFailed: () => void;
  readonly onReschedule: () => void;
  readonly onCancel: () => void;
}

export function DispatchActions({
  canMarkReady,
  canDispatch,
  canMarkDelivered,
  canMarkDeliveryFailed,
  canReschedule,
  canCancel,
  onMarkReady,
  onDispatch,
  onMarkDelivered,
  onMarkDeliveryFailed,
  onReschedule,
  onCancel,
}: DispatchActionsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {canMarkReady && <Button type="button" onClick={onMarkReady}>Marcar lista</Button>}
      {canDispatch && <Button type="button" onClick={onDispatch}>Marcar despachada</Button>}
      {canMarkDelivered && <Button type="button" variant="outline" onClick={onMarkDelivered}>Marcar entregada</Button>}
      {canMarkDeliveryFailed && <Button type="button" variant="outline" onClick={onMarkDeliveryFailed}>Registrar entrega fallida</Button>}
      {canReschedule && <Button type="button" variant="outline" onClick={onReschedule}>Reprogramar</Button>}
      {canCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar guía</Button>}
    </div>
  );
}
