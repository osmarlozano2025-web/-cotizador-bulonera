import type { Address, AuditFields, EntityStatus } from "@/domain/shared";
import type { BranchId, CompanyId } from "@/domain/shared";

export type BranchStatus = Extract<EntityStatus, "active" | "inactive" | "pending" | "blocked">;

export interface Branch extends AuditFields {
  readonly id: BranchId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly code: string;
  readonly address: Address;
  readonly phone?: string;
  readonly email?: string;
  readonly status: BranchStatus;
}
