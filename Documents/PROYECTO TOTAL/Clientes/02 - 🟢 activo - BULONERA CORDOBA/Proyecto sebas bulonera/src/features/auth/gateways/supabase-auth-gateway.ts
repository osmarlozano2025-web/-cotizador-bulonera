import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLES, type Role } from "../roles";
import { buildAuthenticatedUser } from "../services/auth-service";
import type { AuthCredentials, AuthGateway, AuthSession, PasswordResetRequest, PasswordUpdateRequest } from "../types";

interface SupabaseProfileRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
}

interface SupabaseUserRoleRow {
  role_code: string;
}

function isSupabaseProfileRow(value: unknown): value is SupabaseProfileRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.company_id === "string"
    && typeof record.first_name === "string"
    && typeof record.last_name === "string"
    && typeof record.email === "string";
}

function isSupabaseUserRoleRow(value: unknown): value is SupabaseUserRoleRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return typeof (value as Record<string, unknown>).role_code === "string";
}

function mapRoleCode(roleCode: string): Role | null {
  switch (roleCode) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
    case ROLES.SALES_SUPERVISOR:
    case ROLES.SELLER:
    case ROLES.CLIENT:
    case ROLES.WAREHOUSE:
    case ROLES.LOGISTICS:
      return roleCode;
    default:
      return null;
  }
}

export class SupabaseAuthGateway implements AuthGateway {
  public constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error !== null || data.session === null) {
      return null;
    }

    const authUser = data.session.user;
    const profileResult = await this.client
      .from("profiles")
      .select("id, company_id, branch_id, first_name, last_name, email")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileResult.data === null || profileResult.error !== null || !isSupabaseProfileRow(profileResult.data)) {
      return null;
    }

    const profile = profileResult.data;
    const roleResult = await this.client
      .from("user_roles")
      .select("role_code")
      .eq("user_id", authUser.id);

    const roleCodes = (roleResult.data ?? []).flatMap((row) => {
      if (!isSupabaseUserRoleRow(row)) {
        return [];
      }

      const role = mapRoleCode(row.role_code);
      return role === null ? [] : [role];
    });

    const roles = roleCodes.length > 0 ? roleCodes : [ROLES.CLIENT];
    const session: AuthSession = {
      user: buildAuthenticatedUser({
        id: profile.id,
        displayName: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email,
        roles,
        companyId: profile.company_id,
        branchId: profile.branch_id,
      }),
      expiresAt: new Date((data.session.expires_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    };

    return session;
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error !== null || data.session === null) {
      throw new Error(error?.message ?? "No fue posible iniciar sesión.");
    }

    const session = await this.getSession();
    if (session === null) {
      throw new Error("No se pudo cargar el perfil del usuario.");
    }

    return session;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error !== null) {
      throw new Error(error.message);
    }
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(request.email, {
      redirectTo: `${globalThis.location.origin}/reset-password`,
    });
    if (error !== null) {
      throw new Error(error.message);
    }
  }

  async updatePassword(request: PasswordUpdateRequest): Promise<AuthSession> {
    const { error } = await this.client.auth.updateUser({ password: request.password });
    if (error !== null) {
      throw new Error(error.message);
    }

    const session = await this.getSession();
    if (session === null) {
      throw new Error("La sesión expiró durante el cambio de contraseña.");
    }

    return session;
  }

  subscribe(onSessionChange: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange(async () => {
      onSessionChange(await this.getSession());
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }
}
