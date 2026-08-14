import type { Product } from "@/domain/product/product";
import type { ProductId } from "@/domain/shared";
import type {
  ProductCreateResult,
  ProductDetailData,
  ProductFormValues,
  ProductListFilters,
  ProductListResult,
  ProductListSort,
  ProductLookupResult,
  ProductReferenceData,
} from "../types";

export interface ProductListQuery {
  readonly filters: ProductListFilters;
  readonly page: number;
  readonly pageSize: number;
  readonly sort: ProductListSort;
}

export interface ProductRepository {
  getProducts(query: ProductListQuery): Promise<ProductListResult>;
  getProductById(productId: ProductId): Promise<Product | null>;
  getProductDetailData(productId: ProductId): Promise<ProductDetailData | null>;
  getProductLookup(productId: ProductId): Promise<ProductLookupResult | null>;
  createProduct(values: ProductFormValues): Promise<ProductCreateResult>;
  updateProduct(productId: ProductId, values: ProductFormValues): Promise<ProductCreateResult>;
  getReferenceData(): ProductReferenceData;
}
