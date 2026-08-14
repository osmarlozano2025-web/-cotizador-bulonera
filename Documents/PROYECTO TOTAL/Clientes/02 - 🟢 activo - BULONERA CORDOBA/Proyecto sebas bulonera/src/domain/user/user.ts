import type { BranchId, CompanyId, UserId } from "@/domain/shared";
import type { AuditFields, EntityStatus } from "@/domain/shared";
import type { Role, UserRole } from "@/features/auth/roles";

export type UserStatus = Extract<EntityStatus, "active" | "inactive" | "pending" | "blocked" | "suspended">;

export interface User extends AuditFields {
  readonly id: UserId;
  readonly companyId: CompanyId;
  readonly branchId?: BranchId;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly roles: readonly UserRole[];
  readonly status: UserStatus;
}

export interface UserIdentity {
  readonly id: UserId;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly Role[];
}
