import { cn } from "@/lib/cn";
import { getProductStockLabel } from "../utils/product-labels";

const STOCK_CLASS: Record<"ok" | "low" | "empty", string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  low: "border-amber-200 bg-amber-50 text-amber-700",
  empty: "border-rose-200 bg-rose-50 text-rose-700",
};

export function ProductStockBadge({ state }: { readonly state: "ok" | "low" | "empty" }): React.JSX.Element {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", STOCK_CLASS[state])}>{getProductStockLabel(state)}</span>;
}

