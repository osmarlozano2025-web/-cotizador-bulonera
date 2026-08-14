import type { CompanyId, DiscountRuleId, PriceListId, ProductId, ProductPriceId } from "@/domain/shared";
import type { Currency, EntityStatus, Percentage } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type PriceListStatus = Extract<EntityStatus, "active" | "inactive" | "draft" | "archived">;
export type DiscountRuleStatus = Extract<EntityStatus, "active" | "inactive" | "draft" | "archived">;

export const DEFAULT_DISCOUNT_LEVELS = [0, 5, 10, 15, 20] as const;

export const DISCOUNT_SCOPE_LIST = [
  "client",
  "seller",
  "product",
  "productFamily",
  "productLine",
  "priceList",
  "operation",
  "general",
] as const;

export type DiscountScope = (typeof DISCOUNT_SCOPE_LIST)[number];

export interface PriceList {
  readonly id: PriceListId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly code: string;
  readonly currency: Currency;
  readonly status: PriceListStatus;
}

export interface ProductPrice {
  readonly id: ProductPriceId;
  readonly priceListId: PriceListId;
  readonly productId: ProductId;
  readonly amount: number;
  readonly validFrom: ISODateString;
  readonly validTo?: ISODateString;
}

export interface DiscountRule {
  readonly id: DiscountRuleId;
  readonly companyId: CompanyId;
  readonly scope: DiscountScope;
  readonly scopeId: string;
  readonly percentage: Percentage;
  readonly priority: number;
  readonly validFrom: ISODateString;
  readonly validTo?: ISODateString;
  readonly requiresApproval: boolean;
  readonly status: DiscountRuleStatus;
}

export const DISCOUNT_SCOPE_PRIORITY_WEIGHT: Readonly<Record<DiscountScope, number>> = {
  product: 500,
  productFamily: 400,
  productLine: 400,
  client: 300,
  seller: 250,
  priceList: 200,
  operation: 100,
  general: 0,
};
