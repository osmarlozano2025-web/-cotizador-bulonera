import type { EntityId } from "@/types/identity";

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

type DomainId<TName extends string> = Brand<EntityId, TName>;

export type CompanyId = DomainId<"CompanyId">;
export type BranchId = DomainId<"BranchId">;
export type UserId = DomainId<"UserId">;
export type ClientId = DomainId<"ClientId">;
export type ClientAddressId = DomainId<"ClientAddressId">;
export type SellerId = DomainId<"SellerId">;
export type ProductId = DomainId<"ProductId">;
export type ProductFamilyId = DomainId<"ProductFamilyId">;
export type ProductLineId = DomainId<"ProductLineId">;
export type PriceListId = DomainId<"PriceListId">;
export type ProductPriceId = DomainId<"ProductPriceId">;
export type DiscountRuleId = DomainId<"DiscountRuleId">;
export type QuoteId = DomainId<"QuoteId">;
export type QuoteItemId = DomainId<"QuoteItemId">;
export type OrderId = DomainId<"OrderId">;
export type OrderItemId = DomainId<"OrderItemId">;
export type AuthorizationRequestId = DomainId<"AuthorizationRequestId">;
export type DispatchGuideId = DomainId<"DispatchGuideId">;
export type DispatchGuideItemId = DomainId<"DispatchGuideItemId">;
export type TangoSyncJobId = DomainId<"TangoSyncJobId">;
export type AuditLogId = DomainId<"AuditLogId">;
export type NotificationId = DomainId<"NotificationId">;
