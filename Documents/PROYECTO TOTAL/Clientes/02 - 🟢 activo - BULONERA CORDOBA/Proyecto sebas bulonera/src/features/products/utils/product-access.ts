import { PERMISSIONS, ROLES, ROLE_PERMISSION_MAP, type Role } from "@/features/auth";
import type { ProductCapabilities } from "../types";

// canDelete stays false for every role: there is no product-delete workflow in the
// UI yet, even though the central permission map already reserves products.delete.
export function getProductCapabilities(role: Role = ROLES.ADMIN): ProductCapabilities {
  const permissions: readonly string[] = ROLE_PERMISSION_MAP[role];

  return {
    canViewAll: permissions.includes(PERMISSIONS.PRODUCTS_VIEW),
    canCreate: permissions.includes(PERMISSIONS.PRODUCTS_CREATE),
    canEdit: permissions.includes(PERMISSIONS.PRODUCTS_UPDATE),
    canDelete: false,
  };
}

