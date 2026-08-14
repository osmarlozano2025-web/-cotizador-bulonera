import type { BranchId, CompanyId, ProductFamilyId, ProductId, ProductLineId } from "@/domain/shared";
import type { Product, ProductFamily, ProductLine } from "@/domain/product/product";
import { MOCK_QUOTE_PRODUCTS } from "@/features/quotes/data/mock-quotes";
import type {
  ProductDetailData,
  ProductFamilyOption,
  ProductHistoryEntry,
  ProductLineOption,
  ProductReferenceData,
} from "../types";
import { getProductStockLabel } from "../utils/product-labels";
import { getProductStockState } from "../utils/product-calculations";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();

export const MOCK_PRODUCT_COMPANY_ID = asId<CompanyId>("company-cba");
export const MOCK_PRODUCT_BRANCH_ID = asId<BranchId>("branch-central");

export const MOCK_PRODUCT_FAMILIES: readonly ProductFamily[] = [
  { id: asId<ProductFamilyId>("family-fasteners"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Tornillos", code: "TO", status: "active" },
  { id: asId<ProductFamilyId>("family-tools"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Mechas", code: "ME", status: "active" },
  { id: asId<ProductFamilyId>("family-chemicals"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Máquinas Tolsen", code: "MT", status: "active" },
  { id: asId<ProductFamilyId>("family-industrial"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Industrial", code: "IN", status: "active" },
] as const;

export const MOCK_PRODUCT_LINES: readonly ProductLine[] = [
  { id: asId<ProductLineId>("line-screws"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Tornillería", code: "LN-01", status: "active", familyId: asId<ProductFamilyId>("family-fasteners") },
  { id: asId<ProductLineId>("line-anchors"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Anclajes", code: "LN-02", status: "active", familyId: asId<ProductFamilyId>("family-fasteners") },
  { id: asId<ProductLineId>("line-tools"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Herramientas manuales", code: "LN-03", status: "active", familyId: asId<ProductFamilyId>("family-tools") },
  { id: asId<ProductLineId>("line-cuts"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Corte y perforación", code: "LN-04", status: "active", familyId: asId<ProductFamilyId>("family-tools") },
  { id: asId<ProductLineId>("line-adhesives"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Adhesivos", code: "LN-05", status: "active", familyId: asId<ProductFamilyId>("family-chemicals") },
  { id: asId<ProductLineId>("line-protection"), companyId: MOCK_PRODUCT_COMPANY_ID, name: "Protección", code: "LN-06", status: "active", familyId: asId<ProductFamilyId>("family-industrial") },
] as const;

interface ProductSeed {
  readonly familyId: ProductFamilyId;
  readonly lineId?: ProductLineId;
  readonly internalCode: string;
  readonly tangoCode?: string;
  readonly name: string;
  readonly description: string;
  readonly brand?: string;
  readonly unitOfMeasure: Product["unitOfMeasure"];
  readonly basePrice: number;
  readonly stockQuantity: number;
  readonly minimumStock?: number;
  readonly status: Product["status"];
}

const BASE_PRODUCTS = MOCK_QUOTE_PRODUCTS.map((product, index) => ({
  familyId:
    index < 4
      ? asId<ProductFamilyId>("family-fasteners")
      : index < 8
        ? asId<ProductFamilyId>("family-tools")
        : index < 10
          ? asId<ProductFamilyId>("family-chemicals")
          : asId<ProductFamilyId>("family-industrial"),
  lineId:
    index < 2
      ? asId<ProductLineId>("line-screws")
      : index < 4
        ? asId<ProductLineId>("line-anchors")
        : index < 6
          ? asId<ProductLineId>("line-tools")
          : index < 8
            ? asId<ProductLineId>("line-cuts")
            : index < 10
              ? asId<ProductLineId>("line-adhesives")
              : asId<ProductLineId>("line-protection"),
  internalCode: `INT-${String(index + 1).padStart(4, "0")}`,
  tangoCode: `TNG-${String(index + 1).padStart(4, "0")}`,
  name: product.name,
  description: `Producto simulado para el catálogo operativo: ${product.name}.`,
  brand: index % 2 === 0 ? "CB Industrial" : "Bulones Pro",
  unitOfMeasure: product.unitLabel === "metro" ? "meter" : "unit",
  basePrice: product.basePrice,
  stockQuantity: 15 + index * 3,
  minimumStock: 10 + (index % 4) * 5,
  status: index % 5 === 0 ? "inactive" : index % 7 === 0 ? "blocked" : "active",
})) satisfies readonly ProductSeed[];

const EXTRA_PRODUCTS: readonly ProductSeed[] = [
  { familyId: asId<ProductFamilyId>("family-tools"), lineId: asId<ProductLineId>("line-tools"), internalCode: "INT-0013", tangoCode: "TNG-0013", name: "Alicate universal 8\"", description: "Alicate de uso general para instalación y mantenimiento.", brand: "CB Industrial", unitOfMeasure: "unit", basePrice: 1850, stockQuantity: 24, minimumStock: 8, status: "active" },
  { familyId: asId<ProductFamilyId>("family-tools"), lineId: asId<ProductLineId>("line-cuts"), internalCode: "INT-0014", tangoCode: "TNG-0014", name: "Broca HSS 8 mm", description: "Broca para metal de alta velocidad.", brand: "Bulones Pro", unitOfMeasure: "unit", basePrice: 620, stockQuantity: 6, minimumStock: 12, status: "active" },
  { familyId: asId<ProductFamilyId>("family-chemicals"), lineId: asId<ProductLineId>("line-adhesives"), internalCode: "INT-0015", tangoCode: "TNG-0015", name: "Silicona neutra", description: "Sellado general para obra y mantenimiento.", brand: "FixIt", unitOfMeasure: "unit", basePrice: 2130, stockQuantity: 0, minimumStock: 8, status: "blocked" },
  { familyId: asId<ProductFamilyId>("family-industrial"), lineId: asId<ProductLineId>("line-protection"), internalCode: "INT-0016", tangoCode: "TNG-0016", name: "Guante de protección", description: "Protección mecánica de uso industrial.", brand: "SafeWork", unitOfMeasure: "unit", basePrice: 790, stockQuantity: 42, minimumStock: 15, status: "active" },
  { familyId: asId<ProductFamilyId>("family-industrial"), lineId: asId<ProductLineId>("line-protection"), internalCode: "INT-0017", tangoCode: "TNG-0017", name: "Lentes de seguridad", description: "Protección ocular para tareas de montaje.", brand: "SafeWork", unitOfMeasure: "unit", basePrice: 1190, stockQuantity: 19, minimumStock: 10, status: "active" },
  { familyId: asId<ProductFamilyId>("family-fasteners"), lineId: asId<ProductLineId>("line-screws"), internalCode: "INT-0018", tangoCode: "TNG-0018", name: "Tarugo 10 mm", description: "Tarugo plástico para fijación liviana.", brand: "CB Industrial", unitOfMeasure: "unit", basePrice: 32, stockQuantity: 120, minimumStock: 30, status: "active" },
] as const;

const PRODUCT_SEEDS: readonly ProductSeed[] = [...BASE_PRODUCTS, ...EXTRA_PRODUCTS];

function getFamilyById(familyId: ProductFamilyId): ProductFamily {
  const family = MOCK_PRODUCT_FAMILIES.find((item) => item.id === familyId);
  if (family === undefined) {
    throw new Error("Familia de producto no encontrada.");
  }

  return family;
}

function getLineById(lineId?: ProductLineId): ProductLine | undefined {
  if (lineId === undefined) {
    return undefined;
  }

  return MOCK_PRODUCT_LINES.find((item) => item.id === lineId);
}

function createProductHistory(product: Product, date: string): readonly ProductHistoryEntry[] {
  return [
    { id: `${product.internalCode}-history-1`, date, title: "Producto creado", description: "Se registró el producto en el catálogo simulado.", status: product.status },
    { id: `${product.internalCode}-history-2`, date, title: "Stock sincronizado", description: `Stock actual: ${product.stockQuantity} unidades.`, status: product.status },
  ];
}

function buildProduct(seed: ProductSeed, index: number): ProductDetailData {
  const now = new Date("2025-07-10T12:00:00.000Z");
  const createdAt = toIso(new Date(now.getTime() - index * 24 * 60 * 60 * 1000));
  const updatedAt = toIso(new Date(new Date(createdAt).getTime() + 2 * 60 * 60 * 1000));
  const productId = index < MOCK_QUOTE_PRODUCTS.length
    ? MOCK_QUOTE_PRODUCTS[index]?.id ?? asId<ProductId>(`product-${index + 1}`)
    : asId<ProductId>(`product-${index + 1}`);
  const product: Product = {
    id: productId,
    companyId: MOCK_PRODUCT_COMPANY_ID,
    branchId: MOCK_PRODUCT_BRANCH_ID,
    internalCode: seed.internalCode,
    ...(seed.tangoCode !== undefined ? { tangoCode: seed.tangoCode } : {}),
    name: seed.name,
    description: seed.description,
    familyId: seed.familyId,
    ...(seed.lineId !== undefined ? { lineId: seed.lineId } : {}),
    ...(seed.brand !== undefined ? { brand: seed.brand } : {}),
    ...(seed.minimumStock !== undefined ? { minimumStock: seed.minimumStock } : {}),
    measure: seed.unitOfMeasure === "meter" ? "Metro" : "Unidad",
    unitOfMeasure: seed.unitOfMeasure,
    basePrice: seed.basePrice,
    stockQuantity: seed.stockQuantity,
    status: seed.status,
    createdAt,
    updatedAt,
  };
  const family = getFamilyById(seed.familyId);
  const line = getLineById(seed.lineId);
  const stockState = getProductStockState(product);

  return {
    product,
    familyName: family.name,
    ...(line !== undefined ? { lineName: line.name } : {}),
    stockState,
    stockLabel: getProductStockLabel(stockState),
    history: createProductHistory(product, createdAt),
  };
}

export const MOCK_PRODUCT_RECORDS: readonly ProductDetailData[] = PRODUCT_SEEDS.map((seed, index) => buildProduct(seed, index));
export const MOCK_PRODUCTS: readonly Product[] = MOCK_PRODUCT_RECORDS.map((record) => record.product);

export function getProductReferenceData(): ProductReferenceData {
  const familyOptions: readonly ProductFamilyOption[] = MOCK_PRODUCT_FAMILIES.map((family) => ({
    id: family.id,
    code: family.code,
    label: family.name,
  }));
  const lineOptions: readonly ProductLineOption[] = MOCK_PRODUCT_LINES.map((line) => ({
    id: line.id,
    code: line.code,
    label: line.name,
    familyId: line.familyId as ProductFamilyId,
  }));
  const linesByFamilyId = Object.fromEntries(
    familyOptions.map((family) => [
      family.id,
      lineOptions.filter((line) => line.familyId === family.id),
    ]),
  ) as ProductReferenceData["linesByFamilyId"];

  return {
    familyOptions,
    lineOptions,
    unitOptions: [
      { id: "unit", label: "Unidad" },
      { id: "box", label: "Caja" },
      { id: "package", label: "Paquete" },
      { id: "kilogram", label: "Kilogramo" },
      { id: "meter", label: "Metro" },
      { id: "liter", label: "Litro" },
    ],
    linesByFamilyId,
  };
}

export function getProductSeedList(): readonly Product[] {
  return MOCK_PRODUCTS;
}

export function getMockProductDetail(product: Product): ProductDetailData {
  const record = MOCK_PRODUCT_RECORDS.find((item) => item.product.id === product.id);
  if (record !== undefined) {
    return {
      ...record,
      product,
      stockState: getProductStockState(product),
      stockLabel: getProductStockLabel(getProductStockState(product)),
    };
  }

  const family = getFamilyById(product.familyId);
  const line = getLineById(product.lineId);
  const stockState = getProductStockState(product);

  return {
    product,
    familyName: family.name,
    ...(line !== undefined ? { lineName: line.name } : {}),
    stockState,
    stockLabel: getProductStockLabel(stockState),
    history: createProductHistory(product, product.createdAt),
  };
}
