import type { BranchId, CompanyId, ProductFamilyId, ProductId, ProductLineId } from "@/domain/shared";
import type { AuditFields, EntityStatus } from "@/domain/shared";

export const UNIT_OF_MEASURE_LIST = ["unit", "box", "package", "kilogram", "meter", "liter"] as const;

export type UnitOfMeasureCode =
  | (typeof UNIT_OF_MEASURE_LIST)[number]
  | (string & Record<never, never>);

export type ProductStatus = Extract<EntityStatus, "active" | "inactive" | "blocked" | "archived">;
export type ProductCatalogStatus = Extract<EntityStatus, "active" | "inactive" | "archived">;

export interface ProductFamily {
  readonly id: ProductFamilyId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly status: ProductCatalogStatus;
}

export interface ProductLine {
  readonly id: ProductLineId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly status: ProductCatalogStatus;
  readonly familyId?: ProductFamilyId;
}

export interface Product extends AuditFields {
  readonly id: ProductId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly internalCode: string;
  readonly tangoCode?: string;
  readonly name: string;
  readonly description: string;
  readonly familyId: ProductFamilyId;
  readonly lineId?: ProductLineId;
  readonly brand?: string;
  readonly measure?: string;
  readonly unitOfMeasure: UnitOfMeasureCode;
  readonly basePrice: number;
  readonly stockQuantity: number;
  readonly minimumStock?: number;
  readonly imageUrl?: string;
  readonly status: ProductStatus;
}
