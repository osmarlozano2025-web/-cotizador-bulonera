import type { Product } from "@/domain/product/product";

export function getProductStockState(product: Pick<Product, "stockQuantity" | "minimumStock">): "ok" | "low" | "empty" {
  if (product.stockQuantity <= 0) {
    return "empty";
  }

  if (product.minimumStock !== undefined && product.stockQuantity <= product.minimumStock) {
    return "low";
  }

  return "ok";
}

export function isProductLowStock(product: Pick<Product, "stockQuantity" | "minimumStock">): boolean {
  return getProductStockState(product) === "low";
}

