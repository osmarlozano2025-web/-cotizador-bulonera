import type { ReactNode } from "react";
import { hasAllPermissions, hasAnyPermission, hasPermission, hasRole } from "./access";
import type { DeletePermission, EditPermission, Permission, ViewPermission } from "./permissions";
import type { Role } from "./roles";
import type { AuthenticatedUser } from "./types";

interface AccessProps { user: AuthenticatedUser | null; children: ReactNode; fallback?: ReactNode; }
interface RequireRoleProps extends AccessProps { role: Role; }
interface RequirePermissionProps extends AccessProps { permission: Permission; }
interface CanAccessProps extends AccessProps { any?: readonly Permission[]; all?: readonly Permission[]; }

export function RequireRole({user,role,children,fallback=null}:RequireRoleProps):ReactNode { return hasRole(user,role) ? children : fallback; }
export function RequirePermission({user,permission,children,fallback=null}:RequirePermissionProps):ReactNode { return hasPermission(user,permission) ? children : fallback; }
export function HasPermission(props:RequirePermissionProps):ReactNode { return <RequirePermission {...props}/>; }
export function CanAccess({user,any=[],all=[],children,fallback=null}:CanAccessProps):ReactNode {
  const allowed=(any.length===0||hasAnyPermission(user,any))&&(all.length===0||hasAllPermissions(user,all));
  return allowed ? children : fallback;
}
export function CanView({permission,...props}:AccessProps & {permission:ViewPermission}):ReactNode { return <RequirePermission permission={permission} {...props}/>; }
export function CanEdit({permission,...props}:AccessProps & {permission:EditPermission}):ReactNode { return <RequirePermission permission={permission} {...props}/>; }
export function CanDelete({permission,...props}:AccessProps & {permission:DeletePermission}):ReactNode { return <RequirePermission permission={permission} {...props}/>; }
