import type { Product } from "@/domain/product/product";
import type { ProductId, ProductLineId } from "@/domain/shared";
import { getMockProductDetail, getProductReferenceData, MOCK_PRODUCT_BRANCH_ID, MOCK_PRODUCT_COMPANY_ID } from "../data/mock-products";
import type { ProductCreateResult, ProductDetailData, ProductFormValues, ProductListResult, ProductLookupResult } from "../types";
import { getProductStockState } from "../utils/product-calculations";
import { getProductStatusLabel } from "../utils/product-labels";
import type { ProductListQuery, ProductRepository } from "./product-repository";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function cloneProduct(product: Product): Product {
  return { ...product };
}

function cloneDetail(detail: ProductDetailData): ProductDetailData {
  return {
    ...detail,
    product: cloneProduct(detail.product),
    history: detail.history.map((entry) => ({ ...entry })),
  };
}

function buildDetail(product: Product, previousDetail?: ProductDetailData, historyDescription?: string): ProductDetailData {
  const base = previousDetail ?? getMockProductDetail(product);
  const stockState = getProductStockState(product);
  const history =
    previousDetail !== undefined && historyDescription !== undefined
      ? [...previousDetail.history, { id: `${product.internalCode}-${Date.now()}`, date: new Date().toISOString(), title: "Producto actualizado", description: historyDescription, status: product.status }]
      : base.history;

  return {
    ...base,
    product,
    stockState,
    stockLabel: stockState === "ok" ? "Stock disponible" : stockState === "low" ? "Stock bajo" : "Sin stock",
    history,
  };
}

function createProductFromForm(values: ProductFormValues, sequence: number, currentProduct?: Product): Product {
  const now = new Date().toISOString();
  const productId = currentProduct?.id ?? (`product-${sequence}` as ProductId);
  return {
    id: productId,
    companyId: currentProduct?.companyId ?? MOCK_PRODUCT_COMPANY_ID,
    branchId: currentProduct?.branchId ?? MOCK_PRODUCT_BRANCH_ID,
    internalCode: values.internalCode,
    ...(values.tangoCode.trim().length > 0 ? { tangoCode: values.tangoCode.trim() } : {}),
    name: values.name,
    description: values.description,
    familyId: values.familyId as Product["familyId"],
    ...(values.lineId.trim().length > 0 ? { lineId: values.lineId as ProductLineId } : {}),
    ...(values.brand.trim().length > 0 ? { brand: values.brand.trim() } : {}),
    unitOfMeasure: values.unitOfMeasure,
    basePrice: values.basePrice,
    stockQuantity: values.stockQuantity,
    ...(values.minimumStock > 0 ? { minimumStock: values.minimumStock } : {}),
    status: values.status,
    createdAt: currentProduct?.createdAt ?? now,
    updatedAt: now,
  };
}

function matchesSearch(detail: ProductDetailData, search: string): boolean {
  if (search.length === 0) {
    return true;
  }

  const normalized = search.toLowerCase();
  const text = [
    detail.product.internalCode,
    detail.product.tangoCode ?? "",
    detail.product.name,
    detail.product.description,
    detail.familyName,
    detail.lineName ?? "",
    detail.product.brand ?? "",
    detail.product.status,
    getProductStatusLabel(detail.product.status),
  ]
    .join(" ")
    .toLowerCase();

  return text.includes(normalized);
}

function matchesFilters(detail: ProductDetailData, query: ProductListQuery): boolean {
  const { filters } = query;
  const statusMatch = filters.status === "all" || detail.product.status === filters.status;
  const familyMatch = filters.familyId === "all" || detail.product.familyId === filters.familyId;
  const lineMatch = filters.lineId === "all" || detail.product.lineId === filters.lineId;
  const currentDate = new Date();
  const createdAt = new Date(detail.product.createdAt);
  const dateRangeMatch =
    filters.dateRange === "all"
    || (filters.dateRange === "last30Days" && currentDate.getTime() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30)
    || (filters.dateRange === "currentMonth" && createdAt.getUTCMonth() === currentDate.getUTCMonth() && createdAt.getUTCFullYear() === currentDate.getUTCFullYear());
  const stockMatch =
    filters.stockView === "all"
    || (filters.stockView === "inStock" && detail.stockState === "ok")
    || (filters.stockView === "lowStock" && detail.stockState === "low")
    || (filters.stockView === "outOfStock" && detail.stockState === "empty");

  return statusMatch && familyMatch && lineMatch && dateRangeMatch && stockMatch && matchesSearch(detail, filters.search);
}

function compareProducts(left: Product, right: Product, query: ProductListQuery): number {
  const direction = query.sort.direction === "asc" ? 1 : -1;
  const leftValue = left[query.sort.field];
  const rightValue = right[query.sort.field];
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * direction;
  }

  return String(leftValue).localeCompare(String(rightValue), "es", { numeric: true, sensitivity: "base" }) * direction;
}

function normalizeInternalCode(value: string): string {
  return value.trim().toLocaleUpperCase("es");
}

export class MockProductRepository implements ProductRepository {
  private readonly records: ProductDetailData[];
  private sequence: number;

  constructor(initialProducts: readonly Product[]) {
    this.records = initialProducts.map((product) => getMockProductDetail(product)).map((detail) => cloneDetail(detail));
    this.sequence = initialProducts.length + 1;
  }

  async getProducts(query: ProductListQuery): Promise<ProductListResult> {
    await delay();
    const filtered = this.records
      .filter((record) => matchesFilters(record, query))
      .slice()
      .sort((left, right) => compareProducts(left.product, right.product, query));
    const start = (query.page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize).map((record) => cloneProduct(record.product));

    return {
      items,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getProductById(productId: ProductId): Promise<Product | null> {
    await delay(80);
    const record = this.records.find((item) => item.product.id === productId);
    return record === undefined ? null : cloneProduct(record.product);
  }

  async getProductDetailData(productId: ProductId): Promise<ProductDetailData | null> {
    await delay(120);
    const record = this.records.find((item) => item.product.id === productId);
    return record === undefined ? null : cloneDetail(record);
  }

  async getProductLookup(productId: ProductId): Promise<ProductLookupResult | null> {
    await delay(80);
    const record = this.records.find((item) => item.product.id === productId);
    return record === undefined ? null : { product: cloneProduct(record.product), detail: cloneDetail(record) };
  }

  async createProduct(values: ProductFormValues): Promise<ProductCreateResult> {
    await delay();
    if (this.records.some((record) => normalizeInternalCode(record.product.internalCode) === normalizeInternalCode(values.internalCode))) {
      throw new Error("Ya existe un producto con ese código interno.");
    }

    const product = createProductFromForm(values, this.sequence);
    this.sequence += 1;
    const detail = buildDetail(product);
    this.records.unshift(detail);
    return { product: cloneProduct(product), detail: cloneDetail(detail) };
  }

  async updateProduct(productId: ProductId, values: ProductFormValues): Promise<ProductCreateResult> {
    await delay();
    const recordIndex = this.records.findIndex((item) => item.product.id === productId);
    if (recordIndex === -1) {
      throw new Error("Producto no encontrado.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Producto no encontrado.");
    }
    if (this.records.some((record) => record.product.id !== productId && normalizeInternalCode(record.product.internalCode) === normalizeInternalCode(values.internalCode))) {
      throw new Error("Ya existe un producto con ese código interno.");
    }
    const updatedProduct = createProductFromForm(values, this.sequence, currentRecord.product);
    const updatedDetail = buildDetail(updatedProduct, currentRecord, "Se actualizó la información del producto.");
    this.records[recordIndex] = updatedDetail;
    return { product: cloneProduct(updatedProduct), detail: cloneDetail(updatedDetail) };
  }

  getReferenceData() {
    return getProductReferenceData();
  }
}
