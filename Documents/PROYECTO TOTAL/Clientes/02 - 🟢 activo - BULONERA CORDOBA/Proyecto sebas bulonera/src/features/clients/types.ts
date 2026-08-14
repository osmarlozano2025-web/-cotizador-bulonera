import type { BranchId, ClientId, PriceListId, SellerId } from "@/domain/shared";
import type { Client, ClientAddress } from "@/domain/client/client";
import type { AccountStatus, ClientCommercialStatus, ClientAddressType, ClientStatus } from "@/domain/client/types";
import type { ISODateString } from "@/types/identity";
export interface ClientListFilters {
  readonly search: string;
  readonly commercialStatus: ClientCommercialStatus | "all";
  readonly accountStatus: AccountStatus | "all";
  readonly sellerId: SellerId | "all" | "unassigned";
  readonly branchId: BranchId | "all";
  readonly debtView: "all" | "withDebt" | "blocked" | "pendingApproval";
}

export type ClientSortField = "code" | "legalName" | "debt" | "creditLimit" | "commercialStatus" | "accountStatus";
export type ClientSortDirection = "asc" | "desc";

export interface ClientListSort {
  readonly field: ClientSortField;
  readonly direction: ClientSortDirection;
}

export const DEFAULT_CLIENT_LIST_SORT: ClientListSort = {
  field: "code",
  direction: "asc",
} as const;

export const DEFAULT_CLIENT_LIST_FILTERS: ClientListFilters = {
  search: "",
  commercialStatus: "all",
  accountStatus: "all",
  sellerId: "all",
  branchId: "all",
  debtView: "all",
} as const;

export const CLIENTS_PAGE_SIZE = 5;

export interface ClientListQuery {
  readonly filters: ClientListFilters;
  readonly page: number;
  readonly pageSize: number;
  readonly sort: ClientListSort;
}

export interface ClientListResult {
  readonly items: readonly Client[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ClientAccountMovement {
  readonly id: string;
  readonly date: ISODateString;
  readonly type: "invoice" | "payment" | "creditNote" | "pendingBalance";
  readonly reference: string;
  readonly amount: number;
  readonly balance: number;
}

export interface ClientRelatedDocument {
  readonly id: string;
  readonly number: string;
  readonly status: string;
  readonly amount: number;
  readonly date: ISODateString;
}

export interface ClientActivityEntry {
  readonly id: string;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
}

export interface ClientAccountSummary {
  readonly clientId: ClientId;
  readonly debtTotal: number;
  readonly overdueDebt: number;
  readonly creditLimit: number;
  readonly creditAvailable: number;
  readonly daysPastDue: number;
  readonly accountStatus: AccountStatus;
  readonly needsAuthorization: boolean;
  readonly ordersCount: number;
  readonly lastPurchaseAt?: ISODateString;
  readonly lastUpdatedAt: ISODateString;
}

export interface ClientDetailData {
  readonly client: Client;
  readonly accountSummary: ClientAccountSummary;
  readonly addresses: readonly ClientAddress[];
  readonly accountMovements: readonly ClientAccountMovement[];
  readonly quotes: readonly ClientRelatedDocument[];
  readonly orders: readonly ClientRelatedDocument[];
  readonly activity: readonly ClientActivityEntry[];
  readonly assignedSellerName?: string;
  readonly priceListName?: string;
}

export interface ClientCapabilities {
  readonly canViewAll: boolean;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canChangeStatus: boolean;
  readonly canSeeDebt: boolean;
  readonly canSeeCreditLimit: boolean;
  readonly canAssignSeller: boolean;
  readonly canModifyDiscounts: boolean;
  readonly canSeeSensitiveDetails: boolean;
}

export interface ClientFormValues {
  readonly clientCode: string;
  readonly legalName: string;
  readonly tradeName: string;
  readonly taxId: string;
  readonly email: string;
  readonly phone: string;
  readonly contactName: string;
  readonly commercialStatus: ClientCommercialStatus;
  readonly assignedSellerId: string;
  readonly priceListId: string;
  readonly generalDiscountPercentage: number;
  readonly creditLimit: number;
  readonly paymentCondition: string;
  readonly accountStatus: AccountStatus;
  readonly notes: string;
  readonly addressType: ClientAddressType;
  readonly street: string;
  readonly streetNumber: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
  readonly country: string;
  readonly references: string;
  readonly isDefault: boolean;
}

export interface ClientFormSubmitInput {
  readonly formValues: ClientFormValues;
  readonly currentClientId?: ClientId;
}

export interface ClientFormDefaults extends ClientFormValues {
  readonly currentClientId?: ClientId;
}

export interface ClientReferenceData {
  readonly branchOptions: readonly { id: BranchId; label: string }[];
  readonly sellerOptions: readonly { id: SellerId; label: string }[];
  readonly priceListOptions: readonly { id: PriceListId; label: string }[];
  readonly paymentConditionOptions: readonly string[];
}

export interface ClientPreviewRow {
  readonly client: Client;
  readonly sellerName: string;
  readonly priceListName: string;
  readonly accountSummary: ClientAccountSummary;
}

export interface ClientLookupResult {
  readonly client: Client;
  readonly detail: ClientDetailData;
}

export type { ClientStatus };
