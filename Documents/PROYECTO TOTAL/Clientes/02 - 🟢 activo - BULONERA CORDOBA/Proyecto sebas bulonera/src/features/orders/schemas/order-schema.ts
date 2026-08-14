import { z } from "zod";
import type { Quote } from "@/domain/quote/quote";
import { CLIENT_PAYMENT_CONDITION_OPTIONS } from "@/features/clients/utils/client-validation";
import type { OrderFormItemValues, OrderFormValues, OrderReferenceData } from "../types";

const requiredText = z.string().trim().min(1, "Este campo es obligatorio.");
const orderItemSchema = z.object({
  id: z.string().trim().min(1, "El ítem es obligatorio."),
  productId: z.string().trim().min(1, "Seleccioná un producto."),
  description: requiredText,
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
  unitPrice: z.coerce.number().positive("El precio debe ser mayor que cero."),
  discountPercentage: z.coerce.number().min(0, "El descuento debe ser mayor o igual a 0.").max(100, "El descuento no puede superar 100."),
  notes: z.string().trim().default(""),
});

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function createOrderFormSchema(referenceData: OrderReferenceData) {
  const clientIds = referenceData.clientOptions.map((option) => option.id);
  const sellerIds = referenceData.sellerOptions.map((option) => option.id);
  const productIds = referenceData.productOptions.map((option) => option.id);
  const quoteIds = referenceData.quoteOptions.map((option) => option.id);

  return z.object({
    clientId: z.string().trim().min(1, "Seleccioná un cliente.").refine((value) => clientIds.includes(value as (typeof clientIds)[number]), "Seleccioná un cliente válido."),
    sellerId: z.string().trim().min(1, "Seleccioná un vendedor.").refine((value) => sellerIds.includes(value as (typeof sellerIds)[number]), "Seleccioná un vendedor válido."),
    paymentCondition: requiredText,
    deliveryAddressId: z.string().trim().min(1, "Seleccioná una dirección."),
    notes: z.string().trim().default(""),
    sourceQuoteId: z.string().trim().default(""),
    items: z.array(orderItemSchema).min(1, "Agregá al menos un producto."),
  }).superRefine((value, context) => {
    if (!CLIENT_PAYMENT_CONDITION_OPTIONS.includes(value.paymentCondition as (typeof CLIENT_PAYMENT_CONDITION_OPTIONS)[number])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentCondition"],
        message: "Seleccioná una condición de pago válida.",
      });
    }

    const clientAddresses = referenceData.addressesByClientId[value.clientId] ?? [];
    if (!clientAddresses.some((address) => address.id === value.deliveryAddressId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddressId"],
        message: "Seleccioná una dirección válida para el cliente.",
      });
    }

    const seenProducts = new Set<string>();
    value.items.forEach((item, index) => {
      if (!productIds.includes(item.productId as (typeof productIds)[number])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "productId"],
          message: "Seleccioná un producto válido.",
        });
      }

      if (seenProducts.has(item.productId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "productId"],
          message: "Consolidá los productos repetidos en una sola línea.",
        });
      }

      seenProducts.add(item.productId);
    });

    if (value.sourceQuoteId.length > 0 && !quoteIds.includes(value.sourceQuoteId as (typeof quoteIds)[number])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceQuoteId"],
        message: "Seleccioná una cotización válida.",
      });
    }
  });
}

export function buildEmptyOrderItem(
  referenceData: OrderReferenceData,
  index = 0,
  usedProductIds: readonly string[] = [],
): OrderFormItemValues {
  const product = referenceData.productOptions.find((option) => !usedProductIds.includes(option.id))
    ?? requireDefined(referenceData.productOptions[0], "Debe existir al menos un producto de referencia.");
  return {
    id: `order-item-${index + 1}`,
    productId: product.id,
    description: product.name,
    quantity: 1,
    unitPrice: product.basePrice,
    discountPercentage: 0,
    notes: "",
  };
}

export function buildOrderFormDefaults(referenceData: OrderReferenceData): OrderFormValues {
  const client = requireDefined(referenceData.clientOptions[0], "Debe existir al menos un cliente de referencia.");
  const seller = requireDefined(referenceData.sellerOptions[0], "Debe existir al menos un vendedor de referencia.");
  const product = requireDefined(referenceData.productOptions[0], "Debe existir al menos un producto de referencia.");
  const address = referenceData.addressesByClientId[client.id]?.[0];

  return {
    clientId: client.id,
    sellerId: seller.id,
    paymentCondition: "Contado",
    deliveryAddressId: address?.id ?? "",
    notes: "",
    sourceQuoteId: "",
    items: [
      {
        id: "order-item-1",
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: product.basePrice,
        discountPercentage: 0,
        notes: "",
      },
    ],
  };
}

type OrderFormSeed = {
  readonly clientId?: string;
  readonly sellerId?: string;
  readonly paymentCondition?: string;
  readonly deliveryAddressId?: string;
  readonly notes?: string;
  readonly sourceQuoteId?: string;
  readonly items?: readonly {
    readonly id?: string;
    readonly productId: string;
    readonly description: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly discountPercentage: number;
    readonly notes?: string;
  }[];
};

export function mapOrderToFormDefaults(order: OrderFormSeed, referenceData: OrderReferenceData): OrderFormValues {
  if (order.items !== undefined && order.items.length > 0) {
    return {
      clientId: order.clientId ?? buildOrderFormDefaults(referenceData).clientId,
      sellerId: order.sellerId ?? buildOrderFormDefaults(referenceData).sellerId,
      paymentCondition: order.paymentCondition ?? "Contado",
      deliveryAddressId: order.deliveryAddressId ?? buildOrderFormDefaults(referenceData).deliveryAddressId,
      notes: order.notes ?? "",
      sourceQuoteId: order.sourceQuoteId ?? "",
      items: order.items.map((item, index) => ({
        id: item.id ?? `order-item-${index + 1}`,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        notes: "",
      })),
    };
  }

  return buildOrderFormDefaults(referenceData);
}

export function mapQuoteToOrderFormDefaults(quote: Quote, referenceData: OrderReferenceData): OrderFormValues {
  const address = referenceData.addressesByClientId[quote.clientId]?.[0];
  return {
    clientId: quote.clientId,
    sellerId: quote.sellerId?.toString() ?? requireDefined(referenceData.sellerOptions[0], "Debe existir al menos un vendedor de referencia.").id,
    paymentCondition: quote.commercialConditions ?? "Contado",
    deliveryAddressId: address?.id ?? "",
    notes: quote.notes ?? "",
    sourceQuoteId: quote.id,
    items: quote.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
      notes: "",
    })),
  };
}
