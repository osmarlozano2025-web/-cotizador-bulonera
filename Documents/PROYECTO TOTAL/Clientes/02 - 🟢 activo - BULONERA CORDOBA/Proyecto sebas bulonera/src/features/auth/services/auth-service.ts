import { environment } from "@/config/environment";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PERMISSION_LIST } from "../permissions";
import { ROLE_DASHBOARD_MAP } from "../dashboard-routes";
import { ROLE_PERMISSION_MAP } from "../role-permissions";
import { ROLES, type Role } from "../roles";
import type { AuthCredentials, AuthGateway, AuthSession, AuthenticatedUser, PasswordResetRequest, PasswordUpdateRequest } from "../types";
import { MockAuthGateway } from "../gateways/mock-auth-gateway";
import { SupabaseAuthGateway } from "../gateways/supabase-auth-gateway";

const mockAuthGateway = new MockAuthGateway();

export function createAuthGateway(): AuthGateway {
  if (environment.authMode === "mock") {
    return mockAuthGateway;
  }

  const supabaseClient = getSupabaseClient();
  if (supabaseClient !== null) {
    return new SupabaseAuthGateway(supabaseClient);
  }

  return mockAuthGateway;
}

export function getDefaultAuthenticatedUser(): AuthenticatedUser {
  const roles: readonly Role[] = [ROLES.SUPER_ADMIN];
  return {
    id: "mock-user",
    displayName: "Administrador",
    email: "admin@cordobabulones.local",
    roles,
    permissions: PERMISSION_LIST,
    tenantContexts: [{ companyId: "company-cba", branchId: "branch-central" }],
  };
}

export function createMockSession(email = "admin@cordobabulones.local"): AuthSession {
  return {
    user: {
      ...getDefaultAuthenticatedUser(),
      email,
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function buildAuthenticatedUser(input: {
  id: string;
  displayName: string;
  email: string;
  roles: readonly Role[];
  companyId: string;
  branchId?: string | null;
}): AuthenticatedUser {
  const permissions = Array.from(new Set(input.roles.flatMap((role) => ROLE_PERMISSION_MAP[role] ?? [])));

  return {
    id: input.id,
    displayName: input.displayName,
    email: input.email,
    roles: input.roles,
    permissions,
    tenantContexts: [{ companyId: input.companyId, branchId: input.branchId ?? "branch-central" }],
  };
}

export function getRedirectPathForRoles(roles: readonly Role[]): string {
  for (const role of roles) {
    const dashboardPath = ROLE_DASHBOARD_MAP[role];
    if (dashboardPath !== undefined) {
      return dashboardPath;
    }
  }

  return "/unauthorized";
}

export function getPostLoginPath(roles: readonly Role[]): string {
  return environment.authMode === "mock" ? "/dashboard" : getRedirectPathForRoles(roles);
}

export type { AuthCredentials, AuthGateway, AuthSession, PasswordResetRequest, PasswordUpdateRequest };
