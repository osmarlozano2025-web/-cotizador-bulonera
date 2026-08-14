import type { CompanyId } from "@/domain/shared";
import type { AuditFields, EntityStatus } from "@/domain/shared";

export type CompanyStatus = Extract<EntityStatus, "active" | "inactive" | "pending" | "blocked">;

export interface Company extends AuditFields {
  readonly id: CompanyId;
  readonly legalName: string;
  readonly tradeName: string;
  readonly taxId: string;
  readonly email?: string;
  readonly phone?: string;
  readonly status: CompanyStatus;
}
