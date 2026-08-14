import type { BranchId, ClientId, CompanyId, SellerId, UserId } from "@/domain/shared";
import type { AuditFields, EntityStatus, Percentage } from "@/domain/shared";

export type SellerStatus = Extract<EntityStatus, "active" | "inactive" | "blocked" | "suspended">;

export interface Seller extends AuditFields {
  readonly id: SellerId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly userId: UserId;
  readonly code: string;
  readonly status: SellerStatus;
  readonly discountLevel: Percentage;
  readonly assignedClientIds: readonly ClientId[];
  readonly zone?: string;
}
