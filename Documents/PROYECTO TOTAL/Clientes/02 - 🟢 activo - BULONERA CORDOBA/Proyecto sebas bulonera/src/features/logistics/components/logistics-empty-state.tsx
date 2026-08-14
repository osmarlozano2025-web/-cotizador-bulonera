import { Truck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

export function LogisticsEmptyState({ title, description }: { readonly title?: string; readonly description?: string }): React.JSX.Element {
  return <EmptyState title={title ?? "Sin pedidos operativos"} description={description ?? "No hay pedidos listos para mostrar en logística."} icon={<Truck className="size-5" />} />;
}

