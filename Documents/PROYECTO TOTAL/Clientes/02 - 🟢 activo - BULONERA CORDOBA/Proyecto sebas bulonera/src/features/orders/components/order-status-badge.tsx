import type { OrderStatus } from "@/domain/order/order";
import { StatusBadge } from "@/components/common/status-badge";
import { getOrderStatusLabel, getOrderStatusTone } from "../utils/order-labels";

const TONE_CLASS: Record<ReturnType<typeof getOrderStatusTone>, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function OrderStatusBadge({ status }: { readonly status: OrderStatus }): React.JSX.Element {
  return <StatusBadge label={getOrderStatusLabel(status)} className={TONE_CLASS[getOrderStatusTone(status)]} />;
}

