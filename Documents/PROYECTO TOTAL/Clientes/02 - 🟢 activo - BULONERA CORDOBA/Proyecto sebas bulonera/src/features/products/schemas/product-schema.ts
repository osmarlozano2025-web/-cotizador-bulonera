import { z } from "zod";
import type { Product } from "@/domain/product/product";
import type { ProductFormValues, ProductReferenceData } from "../types";

function requiredTrimmedText(requiredMessage: string, whitespaceMessage: string) {
  return z.string()
    .min(1, requiredMessage)
    .refine((value) => value.trim().length > 0, requiredMessage)
    .refine((value) => value === value.trim(), whitespaceMessage);
}

export function createProductFormSchema(referenceData: ProductReferenceData) {
  const familyIds = new Set<string>(referenceData.familyOptions.map((option) => option.id));
  const lineIds = new Set<string>(referenceData.lineOptions.map((option) => option.id));
  const unitIds = new Set<string>(referenceData.unitOptions.map((option) => option.id));

  return z.object({
    internalCode: requiredTrimmedText("El código interno es obligatorio.", "El código interno no puede comenzar ni terminar con espacios."),
    tangoCode: z.string().trim().default(""),
    name: requiredTrimmedText("El nombre es obligatorio.", "El nombre no puede comenzar ni terminar con espacios."),
    description: z.string().trim().default(""),
    familyId: z.string().refine((value) => familyIds.has(value), "Seleccioná una familia válida."),
    lineId: z.string().refine((value) => lineIds.has(value), "Seleccioná una línea válida."),
    brand: z.string().trim().default(""),
    unitOfMeasure: z.string().trim().refine((value) => unitIds.has(value), "Seleccioná una unidad válida."),
    basePrice: z.coerce.number().min(0, "El precio no puede ser negativo."),
    stockQuantity: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
    minimumStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo."),
    status: z.enum(["active", "inactive", "blocked", "archived"], { error: "Seleccioná un estado válido." }),
  }).superRefine((value, context) => {
    const selectedLine = referenceData.lineOptions.find((line) => line.id === value.lineId);
    if (selectedLine !== undefined && selectedLine.familyId !== value.familyId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["lineId"], message: "La línea no pertenece a la familia seleccionada." });
    }
  });
}

export function buildProductFormDefaults(referenceData: ProductReferenceData): ProductFormValues {
  const family = referenceData.familyOptions[0];
  const line = referenceData.lineOptions.find((item) => item.familyId === family?.id) ?? referenceData.lineOptions[0];
  const unit = referenceData.unitOptions[0];

  if (family === undefined || line === undefined || unit === undefined) {
    throw new Error("Faltan datos de referencia para construir el formulario de productos.");
  }

  return {
    internalCode: "INT-0000",
    tangoCode: "",
    name: "Producto nuevo",
    description: "Descripción del producto.",
    familyId: family.id,
    lineId: line.id,
    brand: "",
    unitOfMeasure: unit.id,
    basePrice: 0,
    stockQuantity: 0,
    minimumStock: 0,
    status: "active",
  };
}

type ProductFormSeed = {
  readonly internalCode?: string;
  readonly tangoCode?: string;
  readonly name?: string;
  readonly description?: string;
  readonly familyId?: string;
  readonly lineId?: string;
  readonly brand?: string;
  readonly unitOfMeasure?: Product["unitOfMeasure"];
  readonly basePrice?: number;
  readonly stockQuantity?: number;
  readonly minimumStock?: number;
  readonly status?: Product["status"];
};

export function mapProductToFormDefaults(product: ProductFormSeed, referenceData: ProductReferenceData): ProductFormValues {
  const defaults = buildProductFormDefaults(referenceData);
  return {
    internalCode: product.internalCode ?? defaults.internalCode,
    tangoCode: product.tangoCode ?? "",
    name: product.name ?? defaults.name,
    description: product.description ?? defaults.description,
    familyId: product.familyId ?? defaults.familyId,
    lineId: product.lineId ?? defaults.lineId,
    brand: product.brand ?? "",
    unitOfMeasure: product.unitOfMeasure ?? defaults.unitOfMeasure,
    basePrice: product.basePrice ?? defaults.basePrice,
    stockQuantity: product.stockQuantity ?? defaults.stockQuantity,
    minimumStock: product.minimumStock ?? defaults.minimumStock,
    status: product.status ?? defaults.status,
  };
}
