import { ROLES, type Role } from "./roles";

export const DASHBOARD_PATHS = {
  ADMIN: "/admin", SALES: "/sales", CLIENT: "/client", WAREHOUSE: "/warehouse", LOGISTICS: "/logistics",
} as const;

export type DashboardPath = (typeof DASHBOARD_PATHS)[keyof typeof DASHBOARD_PATHS];

export const ROLE_DASHBOARD_MAP = {
  [ROLES.SUPER_ADMIN]: DASHBOARD_PATHS.ADMIN,
  [ROLES.ADMIN]: DASHBOARD_PATHS.ADMIN,
  [ROLES.SALES_SUPERVISOR]: DASHBOARD_PATHS.SALES,
  [ROLES.SELLER]: DASHBOARD_PATHS.SALES,
  [ROLES.CLIENT]: DASHBOARD_PATHS.CLIENT,
  [ROLES.WAREHOUSE]: DASHBOARD_PATHS.WAREHOUSE,
  [ROLES.LOGISTICS]: DASHBOARD_PATHS.LOGISTICS,
} as const satisfies Readonly<Record<Role, DashboardPath>>;
