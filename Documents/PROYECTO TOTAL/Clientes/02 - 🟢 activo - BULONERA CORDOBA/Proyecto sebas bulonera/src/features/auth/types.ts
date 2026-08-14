import type { EntityId, ISODateString, TenantContext } from "@/types/identity";
import type { Permission, PermissionGroup } from "./permissions";
import type { Role, UserRole } from "./roles";

export interface RolePermission { role: Role; permissions: readonly Permission[]; }
export type PermissionMap = Readonly<Record<Role, readonly Permission[]>>;

export interface SessionUser { id: EntityId; displayName: string; email: string; }
export interface AuthenticatedUser extends SessionUser { roles: readonly UserRole[]; permissions: readonly Permission[]; tenantContexts: readonly TenantContext[]; }
export interface AuthSession { user: AuthenticatedUser; expiresAt: ISODateString; }
export interface AuthCredentials { email: string; password: string; }
export interface PasswordResetRequest { email: string; }
export interface PasswordUpdateRequest { password: string; }
export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  signIn(credentials: AuthCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  requestPasswordReset(request: PasswordResetRequest): Promise<void>;
  updatePassword(request: PasswordUpdateRequest): Promise<AuthSession>;
  subscribe(onSessionChange: (session: AuthSession | null) => void): () => void;
}

export interface PermissionGroupDefinition { id: PermissionGroup; permissions: readonly Permission[]; }

export interface AuthState {
  readonly session: AuthSession | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export interface AuthContextValue extends AuthState {
  readonly signIn: (credentials: AuthCredentials) => Promise<AuthSession>;
  readonly signOut: () => Promise<void>;
  readonly requestPasswordReset: (request: PasswordResetRequest) => Promise<void>;
  readonly updatePassword: (request: PasswordUpdateRequest) => Promise<AuthSession>;
  readonly refreshSession: () => Promise<AuthSession | null>;
}
