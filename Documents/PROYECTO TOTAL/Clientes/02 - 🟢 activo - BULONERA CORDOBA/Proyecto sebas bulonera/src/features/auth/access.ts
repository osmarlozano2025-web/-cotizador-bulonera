import { ROLES, type Role } from "./roles";
import type { Permission } from "./permissions";
import type { AuthenticatedUser } from "./types";

export function hasRole(user: AuthenticatedUser | null, role: Role): boolean { return user?.roles.includes(role) ?? false; }
export function hasPermission(user: AuthenticatedUser | null, permission: Permission): boolean { return user?.permissions.includes(permission) ?? false; }
export function hasAnyPermission(user: AuthenticatedUser | null, permissions: readonly Permission[]): boolean { return permissions.some((permission) => hasPermission(user, permission)); }
export function hasAllPermissions(user: AuthenticatedUser | null, permissions: readonly Permission[]): boolean { return permissions.every((permission) => hasPermission(user, permission)); }
export function isAdmin(user: AuthenticatedUser | null): boolean { return hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); }
export function isSeller(user: AuthenticatedUser | null): boolean { return hasRole(user, ROLES.SELLER); }
export function isClient(user: AuthenticatedUser | null): boolean { return hasRole(user, ROLES.CLIENT); }
export function isWarehouse(user: AuthenticatedUser | null): boolean { return hasRole(user, ROLES.WAREHOUSE); }
export function isLogistics(user: AuthenticatedUser | null): boolean { return hasRole(user, ROLES.LOGISTICS); }

function hasAnyRole(user: AuthenticatedUser | null, roles: readonly Role[]): boolean { return roles.some((role) => hasRole(user, role)); }
