import type { BranchId, ClientId, CompanyId, ProductId, QuoteId, QuoteItemId, SellerId, UserId } from "@/domain/shared";
import type { Currency, Percentage } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type QuoteStatus = "draft" | "pendingApproval" | "sent" | "accepted" | "rejected" | "expired" | "converted" | "cancelled";

export interface QuoteItem {
  readonly id: QuoteItemId;
  readonly quoteId: QuoteId;
  readonly productId: ProductId;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercentage: Percentage;
  readonly discountAmount: number;
  readonly lineTotal: number;
}

export interface Quote {
  readonly id: QuoteId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly clientId: ClientId;
  readonly sellerId?: SellerId;
  readonly number: string;
  readonly status: QuoteStatus;
  readonly items: readonly QuoteItem[];
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly currency: Currency;
  readonly validUntil: ISODateString;
  readonly notes?: string;
  readonly commercialConditions?: string;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
