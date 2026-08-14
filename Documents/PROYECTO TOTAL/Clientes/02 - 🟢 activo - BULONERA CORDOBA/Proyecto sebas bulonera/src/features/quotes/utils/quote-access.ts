import { ROLES, type Role } from "@/features/auth";
import type { Quote } from "@/domain/quote/quote";
import type { SellerId } from "@/domain/shared";
import type { QuoteCapabilities } from "../types";
import { isQuoteConvertible } from "./quote-calculations";

const ADMIN_CAPABILITIES: QuoteCapabilities = {
  canViewAll: true,
  canCreate: true,
  canEdit: true,
  canEditOwn: true,
  canDuplicate: true,
  canConvert: true,
  canRequestAuthorization: true,
  canPrint: true,
  canDownloadPdf: true,
  canManageSettings: true,
};

const SUPERVISOR_CAPABILITIES: QuoteCapabilities = {
  ...ADMIN_CAPABILITIES,
  canManageSettings: false,
};

const SELLER_CAPABILITIES: QuoteCapabilities = {
  canViewAll: false,
  canCreate: true,
  canEdit: false,
  canEditOwn: true,
  canDuplicate: true,
  canConvert: true,
  canRequestAuthorization: true,
  canPrint: true,
  canDownloadPdf: true,
  canManageSettings: false,
};

const NO_ACCESS_CAPABILITIES: QuoteCapabilities = {
  canViewAll: false,
  canCreate: false,
  canEdit: false,
  canEditOwn: false,
  canDuplicate: false,
  canConvert: false,
  canRequestAuthorization: false,
  canPrint: false,
  canDownloadPdf: false,
  canManageSettings: false,
};

export function getQuoteCapabilities(role: Role = ROLES.ADMIN, quote?: Quote, currentSellerId?: SellerId): QuoteCapabilities {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return ADMIN_CAPABILITIES;
    case ROLES.SALES_SUPERVISOR:
      return SUPERVISOR_CAPABILITIES;
    case ROLES.SELLER: {
      const isOwnQuote = quote?.sellerId !== undefined && currentSellerId !== undefined && quote.sellerId === currentSellerId;
      return {
        ...SELLER_CAPABILITIES,
        canEditOwn: isOwnQuote || SELLER_CAPABILITIES.canEditOwn,
        canConvert: quote !== undefined && isOwnQuote ? isQuoteConvertible(quote) : SELLER_CAPABILITIES.canConvert,
      };
    }
    case ROLES.CLIENT:
    case ROLES.WAREHOUSE:
    case ROLES.LOGISTICS:
      return NO_ACCESS_CAPABILITIES;
  }
}

export function canSellerManageQuote(quote: Quote, currentSellerId?: SellerId): boolean {
  return quote.sellerId !== undefined && currentSellerId !== undefined && quote.sellerId === currentSellerId;
}
