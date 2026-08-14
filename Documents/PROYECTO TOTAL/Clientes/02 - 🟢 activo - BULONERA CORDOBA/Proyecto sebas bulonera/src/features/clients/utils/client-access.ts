import { ROLES, type Role } from "@/features/auth";
import type { ClientCapabilities } from "../types";

const ALL_ACCESS: ClientCapabilities = {
  canViewAll: true,
  canCreate: true,
  canEdit: true,
  canChangeStatus: true,
  canSeeDebt: true,
  canSeeCreditLimit: true,
  canAssignSeller: true,
  canModifyDiscounts: true,
  canSeeSensitiveDetails: true,
};

const SUPERVISOR_ACCESS: ClientCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: true,
  canChangeStatus: false,
  canSeeDebt: true,
  canSeeCreditLimit: true,
  canAssignSeller: false,
  canModifyDiscounts: true,
  canSeeSensitiveDetails: true,
};

const SELLER_ACCESS: ClientCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canChangeStatus: false,
  canSeeDebt: true,
  canSeeCreditLimit: true,
  canAssignSeller: false,
  canModifyDiscounts: false,
  canSeeSensitiveDetails: true,
};

const CLIENT_ACCESS: ClientCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canChangeStatus: false,
  canSeeDebt: true,
  canSeeCreditLimit: true,
  canAssignSeller: false,
  canModifyDiscounts: false,
  canSeeSensitiveDetails: false,
};

const WAREHOUSE_ACCESS: ClientCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canChangeStatus: false,
  canSeeDebt: false,
  canSeeCreditLimit: false,
  canAssignSeller: false,
  canModifyDiscounts: false,
  canSeeSensitiveDetails: false,
};

export function getClientCapabilities(role: Role = ROLES.ADMIN): ClientCapabilities {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return ALL_ACCESS;
    case ROLES.SALES_SUPERVISOR:
      return SUPERVISOR_ACCESS;
    case ROLES.SELLER:
      return SELLER_ACCESS;
    case ROLES.CLIENT:
      return CLIENT_ACCESS;
    case ROLES.WAREHOUSE:
    case ROLES.LOGISTICS:
      return WAREHOUSE_ACCESS;
  }
}
