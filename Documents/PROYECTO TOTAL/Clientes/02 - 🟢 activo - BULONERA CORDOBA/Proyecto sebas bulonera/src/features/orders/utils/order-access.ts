import { ROLES, type Role } from "@/features/auth";
import type { Order } from "@/domain/order/order";
import type { SellerId } from "@/domain/shared";
import type { OrderCapabilities } from "../types";

const ADMIN_ACCESS: OrderCapabilities = {
  canViewAll: true,
  canCreate: true,
  canEdit: true,
  canEditOwn: true,
  canDuplicate: true,
  canApprove: true,
  canCancel: true,
  canPrepare: true,
  canDispatch: true,
  canSyncTango: true,
  canViewPreparedOnly: false,
};

const SUPERVISOR_ACCESS: OrderCapabilities = {
  ...ADMIN_ACCESS,
  canSyncTango: false,
};

const SELLER_ACCESS: OrderCapabilities = {
  canViewAll: false,
  canCreate: true,
  canEdit: false,
  canEditOwn: true,
  canDuplicate: true,
  canApprove: false,
  canCancel: false,
  canPrepare: false,
  canDispatch: false,
  canSyncTango: false,
  canViewPreparedOnly: false,
};

const LOGISTICS_ACCESS: OrderCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canEditOwn: false,
  canDuplicate: false,
  canApprove: false,
  canCancel: false,
  canPrepare: false,
  canDispatch: true,
  canSyncTango: false,
  canViewPreparedOnly: true,
};

const NO_ACCESS: OrderCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canEditOwn: false,
  canDuplicate: false,
  canApprove: false,
  canCancel: false,
  canPrepare: false,
  canDispatch: false,
  canSyncTango: false,
  canViewPreparedOnly: false,
};

export function getOrderCapabilities(role: Role = ROLES.ADMIN, order?: Order, currentSellerId?: SellerId): OrderCapabilities {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return ADMIN_ACCESS;
    case ROLES.SALES_SUPERVISOR:
      return SUPERVISOR_ACCESS;
    case ROLES.SELLER: {
      const isOwnOrder = order?.sellerId !== undefined && currentSellerId !== undefined && order.sellerId === currentSellerId;
      return {
        ...SELLER_ACCESS,
        canEditOwn: isOwnOrder || SELLER_ACCESS.canEditOwn,
      };
    }
    case ROLES.LOGISTICS:
      return LOGISTICS_ACCESS;
    case ROLES.CLIENT:
    case ROLES.WAREHOUSE:
      return NO_ACCESS;
  }
}
