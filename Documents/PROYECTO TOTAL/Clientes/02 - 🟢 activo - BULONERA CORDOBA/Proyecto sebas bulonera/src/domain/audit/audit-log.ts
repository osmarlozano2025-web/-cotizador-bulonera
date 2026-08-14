import type { AuditLogId, BranchId, CompanyId, UserId } from "@/domain/shared";
import type { SafeJsonValue } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export interface AuditLog {
  readonly id: AuditLogId;
  readonly companyId: CompanyId;
  readonly branchId?: BranchId;
  readonly userId: UserId;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly previousValue?: SafeJsonValue;
  readonly newValue?: SafeJsonValue;
  readonly reason?: string;
  readonly createdAt: ISODateString;
}
