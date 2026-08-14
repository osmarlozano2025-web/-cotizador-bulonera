export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SALES_SUPERVISOR: "SALES_SUPERVISOR",
  SELLER: "SELLER",
  CLIENT: "CLIENT",
  WAREHOUSE: "WAREHOUSE",
  LOGISTICS: "LOGISTICS",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type UserRole = Role;

export const DEFAULT_ROLE: Role = ROLES.CLIENT;
export const ROLE_LIST: readonly Role[] = Object.freeze(Object.values(ROLES));
