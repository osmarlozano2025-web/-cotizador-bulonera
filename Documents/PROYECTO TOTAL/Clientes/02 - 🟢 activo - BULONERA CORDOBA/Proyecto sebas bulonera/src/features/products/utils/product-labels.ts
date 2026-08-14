import type { ProductStatus } from "@/domain/product/product";
import type { ProductStockViewFilter } from "../types";

export function getProductStatusLabel(status: ProductStatus): string {
  const labels: Record<ProductStatus, string> = {
    active: "Activo",
    inactive: "Inactivo",
    blocked: "Bloqueado",
    archived: "Archivado",
  };

  return labels[status];
}

export function getProductStockLabel(stockState: "ok" | "low" | "empty"): string {
  const labels: Record<typeof stockState, string> = {
    ok: "Stock disponible",
    low: "Stock bajo",
    empty: "Sin stock",
  };

  return labels[stockState];
}

export function getProductStockViewLabel(view: ProductStockViewFilter): string {
  const labels: Record<ProductStockViewFilter, string> = {
    all: "Todo",
    inStock: "Con stock",
    lowStock: "Stock bajo",
    outOfStock: "Sin stock",
  };

  return labels[view];
}

