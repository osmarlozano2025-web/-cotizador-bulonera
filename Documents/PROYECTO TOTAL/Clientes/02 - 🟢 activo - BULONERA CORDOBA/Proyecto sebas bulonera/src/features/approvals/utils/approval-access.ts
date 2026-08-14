import { ROLES, type Role } from "@/features/auth";
import type { ApprovalCapabilities } from "../types";

const ADMIN_ACCESS: ApprovalCapabilities = {
  canViewAll: true,
  canViewOwn: true,
  canApprove: true,
  canReject: true,
  canCancel: true,
  canComment: true,
};

const SUPERVISOR_ACCESS: ApprovalCapabilities = {
  ...ADMIN_ACCESS,
};

const SELLER_ACCESS: ApprovalCapabilities = {
  canViewAll: false,
  canViewOwn: true,
  canApprove: false,
  canReject: false,
  canCancel: false,
  canComment: true,
};

const NO_ACCESS: ApprovalCapabilities = {
  canViewAll: false,
  canViewOwn: false,
  canApprove: false,
  canReject: false,
  canCancel: false,
  canComment: false,
};

export function getApprovalCapabilities(role: Role = ROLES.ADMIN): ApprovalCapabilities {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return ADMIN_ACCESS;
    case ROLES.SALES_SUPERVISOR:
      return SUPERVISOR_ACCESS;
    case ROLES.SELLER:
      return SELLER_ACCESS;
    case ROLES.CLIENT:
    case ROLES.WAREHOUSE:
    case ROLES.LOGISTICS:
      return NO_ACCESS;
  }
}

