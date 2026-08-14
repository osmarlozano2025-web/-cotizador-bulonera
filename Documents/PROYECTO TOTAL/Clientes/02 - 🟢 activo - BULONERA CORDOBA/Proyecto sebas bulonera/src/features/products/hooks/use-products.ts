import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ROLES, type Role } from "@/features/auth";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { Product } from "@/domain/product/product";
import type { ProductId } from "@/domain/shared";
import type {
  ProductCapabilities,
  ProductDetailData,
  ProductListFilters,
  ProductListResult,
  ProductListSort,
  ProductPreviewRow,
  ProductReferenceData,
} from "../types";
import { DEFAULT_PRODUCT_LIST_FILTERS, DEFAULT_PRODUCT_LIST_SORT, PRODUCTS_PAGE_SIZE } from "../types";
import { getProductCapabilities } from "../utils/product-access";
import { getProductStockLabel, getProductStatusLabel } from "../utils/product-labels";
import { createProduct as createProductService, getProductDetailData as getProductDetailDataService, getProductReferenceDataService, getProducts as getProductsService, updateProduct as updateProductService } from "../services/product-service";
import type { ProductFormValues } from "../types";

interface UseProductsResult {
  readonly filters: ProductListFilters;
  readonly setFilters: (next: ProductListFilters) => void;
  readonly resetFilters: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly sort: ProductListSort;
  readonly setSort: (sort: ProductListSort) => void;
  readonly result: ProductListResult | null;
  readonly previewRows: readonly ProductPreviewRow[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ProductCapabilities;
  readonly referenceData: ProductReferenceData;
}

export function useProducts(initialFilters: Partial<ProductListFilters> = {}, role: Role = ROLES.ADMIN): UseProductsResult {
  const [searchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<ProductListFilters>({ ...DEFAULT_PRODUCT_LIST_FILTERS, ...initialFilters });
  const [page, setPageState] = useState(1);
  const [sort, setSortState] = useState<ProductListSort>(DEFAULT_PRODUCT_LIST_SORT);
  const [result, setResult] = useState<ProductListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getProductCapabilities(role), [role]);
  const referenceData = useMemo(() => getProductReferenceDataService(), []);
  const mockError = searchParams.get("mockError") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mockError) {
        throw new Error("No fue posible cargar los productos simulados.");
      }

      const nextResult = await getProductsService({ filters, page, pageSize: PRODUCTS_PAGE_SIZE, sort });
      setResult(nextResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [filters, mockError, page, sort]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  const previewRows = useMemo<readonly ProductPreviewRow[]>(() => {
    const rows = result?.items ?? [];
    return rows.map((product) => {
      const familyName = referenceData.familyOptions.find((option) => option.id === product.familyId)?.label ?? "Sin familia";
      const lineName = referenceData.lineOptions.find((option) => option.id === product.lineId)?.label ?? "Sin línea";
      const stockState = product.stockQuantity <= 0 ? "empty" : product.minimumStock !== undefined && product.stockQuantity <= product.minimumStock ? "low" : "ok";
      const searchText = [product.internalCode, product.tangoCode ?? "", product.name, product.description, familyName, lineName, product.brand ?? "", product.status, getProductStatusLabel(product.status)].join(" ").toLowerCase();

      return {
        product,
        familyName,
        lineName,
        stockState,
        stockLabel: getProductStockLabel(stockState),
        searchText,
        lowStock: stockState === "low",
        outOfStock: stockState === "empty",
      };
    });
  }, [referenceData.familyOptions, referenceData.lineOptions, result?.items]);

  return {
    filters,
    setFilters: (next) => {
      setPageState(1);
      setFiltersState(next);
    },
    resetFilters: () => {
      setPageState(1);
      setFiltersState(DEFAULT_PRODUCT_LIST_FILTERS);
    },
    page,
    setPage: setPageState,
    pageSize: PRODUCTS_PAGE_SIZE,
    sort,
    setSort: (nextSort) => {
      setPageState(1);
      setSortState(nextSort);
    },
    result,
    previewRows,
    loading,
    error,
    refresh: load,
    capabilities,
    referenceData,
  };
}

export function useProduct(productId?: ProductId, role: Role = ROLES.ADMIN): {
  readonly detail: ProductDetailData | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly capabilities: ProductCapabilities;
} {
  const [detail, setDetail] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = useMemo(() => getProductCapabilities(role), [role]);

  const load = useCallback(async () => {
    if (productId === undefined) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getProductDetailDataService(productId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [load]);

  return {
    detail,
    loading,
    error,
    refresh: load,
    capabilities,
  };
}

export function useCreateProduct(): {
  readonly createProduct: (values: ProductFormValues) => Promise<Product>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: ProductFormValues) => {
    const result = await createProductService(values);
    return result.product;
  });

  return { createProduct: run, loading, error };
}

export function useUpdateProduct(productId?: ProductId): {
  readonly updateProduct: (values: ProductFormValues) => Promise<Product>;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const { run, loading, error } = useAsyncAction(async (values: ProductFormValues) => {
    const result = await updateProductService(productId as ProductId, values);
    return result.product;
  });

  const updateProduct = useCallback(
    (values: ProductFormValues) => {
      if (productId === undefined) {
        throw new Error("No se pudo identificar el producto a editar.");
      }

      return run(values);
    },
    [productId, run],
  );

  return { updateProduct, loading, error };
}
