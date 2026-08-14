import type { ProductStatus } from "@/domain/product/product";
import { StatusBadge } from "@/components/common/status-badge";
import { getProductStatusLabel } from "../utils/product-labels";

const STATUS_CLASS: Record<ProductStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  archived: "border-amber-200 bg-amber-50 text-amber-700",
};

export function ProductStatusBadge({ status }: { readonly status: ProductStatus }): React.JSX.Element {
  return <StatusBadge label={getProductStatusLabel(status)} className={STATUS_CLASS[status]} />;
}

