import type { ProductFamilyId, ProductId, ProductLineId } from "@/domain/shared";
import type { Product, ProductStatus, UnitOfMeasureCode } from "@/domain/product/product";
import type { ISODateString } from "@/types/identity";

export type ProductDateRangeFilter = "all" | "currentMonth" | "last30Days";
export type ProductStockViewFilter = "all" | "inStock" | "lowStock" | "outOfStock";
export type ProductSortField = "internalCode" | "name" | "basePrice" | "stockQuantity";
export type ProductSortDirection = "asc" | "desc";

export interface ProductListSort {
  readonly field: ProductSortField;
  readonly direction: ProductSortDirection;
}

export const DEFAULT_PRODUCT_LIST_SORT: ProductListSort = {
  field: "internalCode",
  direction: "asc",
};

export interface ProductListFilters {
  readonly search: string;
  readonly status: ProductStatus | "all";
  readonly familyId: ProductFamilyId | "all";
  readonly lineId: ProductLineId | "all";
  readonly stockView: ProductStockViewFilter;
  readonly dateRange: ProductDateRangeFilter;
}

export const DEFAULT_PRODUCT_LIST_FILTERS: ProductListFilters = {
  search: "",
  status: "all",
  familyId: "all",
  lineId: "all",
  stockView: "all",
  dateRange: "all",
} as const;

export const PRODUCTS_PAGE_SIZE = 8;

export interface ProductFamilyOption {
  readonly id: ProductFamilyId;
  readonly code: string;
  readonly label: string;
}

export interface ProductLineOption {
  readonly id: ProductLineId;
  readonly code: string;
  readonly label: string;
  readonly familyId: ProductFamilyId;
}

export interface ProductUnitOption {
  readonly id: UnitOfMeasureCode;
  readonly label: string;
}

export interface ProductReferenceData {
  readonly familyOptions: readonly ProductFamilyOption[];
  readonly lineOptions: readonly ProductLineOption[];
  readonly unitOptions: readonly ProductUnitOption[];
  readonly linesByFamilyId: Readonly<Record<string, readonly ProductLineOption[]>>;
}

export interface ProductFormValues {
  readonly internalCode: string;
  readonly tangoCode: string;
  readonly name: string;
  readonly description: string;
  readonly familyId: string;
  readonly lineId: string;
  readonly brand: string;
  readonly unitOfMeasure: UnitOfMeasureCode;
  readonly basePrice: number;
  readonly stockQuantity: number;
  readonly minimumStock: number;
  readonly status: ProductStatus;
}

export interface ProductFormDefaults extends ProductFormValues {
  readonly currentProductId?: string;
}

export interface ProductFormSubmitInput {
  readonly formValues: ProductFormValues;
  readonly currentProductId?: ProductId;
}

export interface ProductHistoryEntry {
  readonly id: string;
  readonly date: ISODateString;
  readonly title: string;
  readonly description: string;
  readonly status?: ProductStatus;
}

export interface ProductDetailData {
  readonly product: Product;
  readonly familyName: string;
  readonly lineName?: string;
  readonly stockState: "ok" | "low" | "empty";
  readonly stockLabel: string;
  readonly history: readonly ProductHistoryEntry[];
}

export interface ProductPreviewRow {
  readonly product: Product;
  readonly familyName: string;
  readonly lineName: string;
  readonly stockState: "ok" | "low" | "empty";
  readonly stockLabel: string;
  readonly searchText: string;
  readonly lowStock: boolean;
  readonly outOfStock: boolean;
}

export interface ProductListResult {
  readonly items: readonly Product[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ProductCapabilities {
  readonly canViewAll: boolean;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}

export interface ProductCreateResult {
  readonly product: Product;
  readonly detail: ProductDetailData;
}

export interface ProductLookupResult {
  readonly product: Product;
  readonly detail: ProductDetailData;
}
