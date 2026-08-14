import { z } from "zod";
import type { QuoteFormDefaults, QuoteFormItemValues, QuoteFormValues, QuoteReferenceData } from "../types";

const STATUS_VALUES = ["draft", "pendingApproval", "sent", "accepted", "rejected", "expired", "converted", "cancelled"] as const;

const requiredText = z.string().trim().min(1, "Este campo es obligatorio.");

const dateString = z
  .string()
  .trim()
  .min(1, "La fecha es obligatoria.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "La fecha ingresada no es válida.");

const quoteItemSchema = z.object({
  id: z.string().trim().min(1, "El ítem es obligatorio."),
  productId: z.string().trim().min(1, "Seleccioná un producto."),
  description: requiredText,
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
  unitPrice: z.coerce.number().min(0, "El precio debe ser mayor o igual a cero."),
  discountPercentage: z.coerce.number().min(0, "El descuento debe ser mayor o igual a 0.").max(100, "El descuento no puede superar 100."),
});

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function createQuoteFormSchema(referenceData: QuoteReferenceData) {
  const clientIds = referenceData.clientOptions.map((option) => option.id);
  const sellerIds = referenceData.sellerOptions.map((option) => option.id);
  const productIds = referenceData.productOptions.map((option) => option.id);

  return z.object({
    clientId: z.string().trim().min(1, "Seleccioná un cliente.").refine((value) => clientIds.includes(value as (typeof clientIds)[number]), "Seleccioná un cliente válido."),
    sellerId: z.string().trim().min(1, "Seleccioná un vendedor.").refine((value) => sellerIds.includes(value as (typeof sellerIds)[number]), "Seleccioná un vendedor válido."),
    status: z.enum(STATUS_VALUES),
    validUntil: dateString,
    commercialConditions: z.string().trim().default(""),
    notes: z.string().trim().default(""),
    items: z.array(quoteItemSchema).min(1, "Agregá al menos un producto."),
  }).superRefine((value, context) => {
    const productIdsSeen = new Map<string, number>();

    value.items.forEach((item, index) => {
      if (!productIds.includes(item.productId as (typeof productIds)[number])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "productId"],
          message: "Seleccioná un producto válido.",
        });
      }

      const existingIndex = productIdsSeen.get(item.productId);
      if (existingIndex !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "productId"],
          message: "No podés repetir el mismo producto en la cotización.",
        });
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", existingIndex, "productId"],
          message: "No podés repetir el mismo producto en la cotización.",
        });
      } else {
        productIdsSeen.set(item.productId, index);
      }
    });
  });
}

export function buildEmptyQuoteItem(referenceData: QuoteReferenceData, index = 0): QuoteFormItemValues {
  const product = requireDefined(referenceData.productOptions[0], "Debe existir al menos un producto de referencia.");
  return {
    id: `quote-item-${index + 1}`,
    productId: product.id,
    description: product.name,
    quantity: 1,
    unitPrice: product.basePrice,
    discountPercentage: 0,
  };
}

function normalizeDateInput(value: string): string {
  return value.slice(0, 10);
}

export function buildQuoteFormDefaults(referenceData: QuoteReferenceData): QuoteFormValues {
  const defaultProduct = requireDefined(referenceData.productOptions[0], "Debe existir al menos un producto de referencia.");
  return {
    clientId: referenceData.clientOptions[0]?.id ?? "",
    sellerId: referenceData.sellerOptions[0]?.id ?? "",
    status: "draft",
    validUntil: normalizeDateInput(new Date().toISOString()),
    commercialConditions: "",
    notes: "",
    items: [
      {
        id: "quote-item-1",
        productId: defaultProduct.id,
        description: defaultProduct.name,
        quantity: 1,
        unitPrice: defaultProduct.basePrice,
        discountPercentage: 0,
      },
    ],
  };
}

export function mapQuoteToFormDefaults(quote: Partial<QuoteFormDefaults>, referenceData: QuoteReferenceData): QuoteFormValues {
  if (quote.items !== undefined && quote.items.length > 0) {
    return {
      clientId: quote.clientId ?? referenceData.clientOptions[0]?.id ?? "",
      sellerId: quote.sellerId ?? referenceData.sellerOptions[0]?.id ?? "",
      status: quote.status ?? "draft",
      validUntil: normalizeDateInput(quote.validUntil ?? new Date().toISOString()),
      commercialConditions: quote.commercialConditions ?? "",
      notes: quote.notes ?? "",
      items: quote.items.map((item, index) => ({
        id: item.id ?? `quote-item-${index + 1}`,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
      })),
    };
  }

  return buildQuoteFormDefaults(referenceData);
}
