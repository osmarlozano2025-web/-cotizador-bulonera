import type {
  BranchId,
  ClientAddressId,
  ClientId,
  CompanyId,
  PriceListId,
  SellerId,
} from "@/domain/shared";
import type { Address, AuditFields, Money, Percentage } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";
import type { ClientAddressType, ClientCommercialStatus, ClientStatus, CreditCondition, AccountStatus } from "./types";

export interface ClientAddress extends Address {
  readonly id: ClientAddressId;
  readonly clientId: ClientId;
  readonly type: ClientAddressType;
  readonly isDefault?: boolean;
}

export interface Client extends AuditFields {
  readonly id: ClientId;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly assignedSellerId?: SellerId;
  readonly code: string;
  readonly legalName: string;
  readonly tradeName?: string;
  readonly contactName?: string;
  readonly taxId: string;
  readonly email?: string;
  readonly phone?: string;
  readonly addresses: readonly ClientAddress[];
  readonly priceListId?: PriceListId;
  readonly generalDiscountPercentage?: Percentage;
  readonly creditLimit: Money;
  readonly currentDebt: Money;
  readonly overdueDebt: Money;
  readonly accountStatus: AccountStatus;
  readonly commercialStatus: ClientCommercialStatus;
  readonly paymentCondition: string;
  readonly notes?: string;
  readonly status: ClientStatus;
}

export interface ClientDebt {
  readonly clientId: ClientId;
  readonly totalDebt: Money;
  readonly overdueDebt: Money;
  readonly creditLimit: Money;
  readonly daysPastDue: number;
  readonly isBlocked: boolean;
  readonly lastUpdatedAt: ISODateString;
}

export interface ClientFinancialSnapshot {
  readonly clientId: ClientId;
  readonly accountStatus: AccountStatus;
  readonly creditCondition: CreditCondition;
  readonly currentDebt: Money;
  readonly overdueDebt: Money;
  readonly creditLimit: Money;
  readonly lastUpdatedAt: ISODateString;
}

export type { ClientAddressType, ClientCommercialStatus, ClientStatus, CreditCondition, AccountStatus };
