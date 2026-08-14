import { z } from "zod";
import { CLIENT_PAYMENT_CONDITION_OPTIONS, hasPartialAddress, isValidArgentineTaxId, isValidPhoneNumber } from "../utils/client-validation";
import type { ClientFormDefaults, ClientFormValues, ClientReferenceData } from "../types";

const COMMERCIAL_STATUS_VALUES = ["active", "inactive", "blocked", "suspended", "pendingApproval", "underReview"] as const;
const ACCOUNT_STATUS_VALUES = ["current", "overdue", "exceededCreditLimit", "blocked", "underReview"] as const;
const ADDRESS_TYPE_VALUES = ["billing", "shipping", "commercial"] as const;

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim() === "" ? undefined : value.trim();
  },
  z.string().optional(),
);

const requiredText = z.string().trim().min(1);

export function createClientFormSchema(referenceData: ClientReferenceData) {
  const sellerIds = referenceData.sellerOptions.map((option) => option.id);
  const priceListIds = referenceData.priceListOptions.map((option) => option.id);
  const paymentConditions = referenceData.paymentConditionOptions.length > 0 ? referenceData.paymentConditionOptions : CLIENT_PAYMENT_CONDITION_OPTIONS;

  return z.object({
    clientCode: requiredText.min(1, "El código es obligatorio."),
    legalName: requiredText.min(1, "La razón social es obligatoria."),
    tradeName: z.string().trim().default(""),
    taxId: requiredText.min(1, "El CUIT es obligatorio.")
      .refine((value) => isValidArgentineTaxId(value), "El CUIT ingresado no es válido.")
      .transform((value) => value.replace(/[\s-]/g, "").trim()),
    email: optionalText.refine((value) => value === undefined || z.string().email("El correo electrónico no es válido.").safeParse(value).success, "El correo electrónico no es válido."),
    phone: z.string().trim().default("").refine((value) => isValidPhoneNumber(value), "El teléfono ingresado no es válido."),
    contactName: z.string().trim().default(""),
    commercialStatus: z.enum(COMMERCIAL_STATUS_VALUES),
    assignedSellerId: optionalText.refine((value) => value === undefined || sellerIds.includes(value as (typeof sellerIds)[number]), "Seleccioná un vendedor válido."),
    priceListId: optionalText.refine((value) => value === undefined || priceListIds.includes(value as (typeof priceListIds)[number]), "Seleccioná una lista de precios válida."),
    generalDiscountPercentage: z.coerce.number().min(0, "El descuento debe ser mayor o igual a 0.").max(100, "El descuento debe estar entre 0 y 100."),
    creditLimit: z.coerce.number().min(0, "El límite de crédito no puede ser negativo."),
    paymentCondition: requiredText.min(1, "La condición de pago es obligatoria.").refine((value) => paymentConditions.includes(value), "Seleccioná una condición de pago válida."),
    accountStatus: z.enum(ACCOUNT_STATUS_VALUES),
    notes: z.string().trim().default(""),
    addressType: z.enum(ADDRESS_TYPE_VALUES),
    street: requiredText.min(1, "La calle es obligatoria."),
    streetNumber: z.string().trim().default(""),
    city: requiredText.min(1, "La ciudad es obligatoria."),
    province: requiredText.min(1, "La provincia es obligatoria."),
    postalCode: z.string().trim().default(""),
    country: requiredText.min(1, "El país es obligatorio."),
    references: z.string().trim().default(""),
    isDefault: z.boolean().default(true),
  }).superRefine((values, context) => {
    if (hasPartialAddress(values) && values.street.trim().length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["street"], message: "La calle es obligatoria." });
    }
  });
}

export const DEFAULT_CLIENT_FORM_VALUES: ClientFormValues = {
  clientCode: "",
  legalName: "",
  tradeName: "",
  taxId: "",
  email: "",
  phone: "",
  contactName: "",
  commercialStatus: "active",
  assignedSellerId: "",
  priceListId: "",
  generalDiscountPercentage: 0,
  creditLimit: 0,
  paymentCondition: "Contado",
  accountStatus: "current",
  notes: "",
  addressType: "commercial",
  street: "",
  streetNumber: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Argentina",
  references: "",
  isDefault: true,
};

export function mapClientToFormDefaults(client?: Partial<ClientFormDefaults>): ClientFormValues {
  return {
    clientCode: client?.clientCode ?? DEFAULT_CLIENT_FORM_VALUES.clientCode,
    legalName: client?.legalName ?? DEFAULT_CLIENT_FORM_VALUES.legalName,
    tradeName: client?.tradeName ?? DEFAULT_CLIENT_FORM_VALUES.tradeName,
    taxId: client?.taxId ?? DEFAULT_CLIENT_FORM_VALUES.taxId,
    email: client?.email ?? DEFAULT_CLIENT_FORM_VALUES.email,
    phone: client?.phone ?? DEFAULT_CLIENT_FORM_VALUES.phone,
    contactName: client?.contactName ?? DEFAULT_CLIENT_FORM_VALUES.contactName,
    commercialStatus: client?.commercialStatus ?? DEFAULT_CLIENT_FORM_VALUES.commercialStatus,
    assignedSellerId: client?.assignedSellerId ?? DEFAULT_CLIENT_FORM_VALUES.assignedSellerId,
    priceListId: client?.priceListId ?? DEFAULT_CLIENT_FORM_VALUES.priceListId,
    generalDiscountPercentage: client?.generalDiscountPercentage ?? DEFAULT_CLIENT_FORM_VALUES.generalDiscountPercentage,
    creditLimit: client?.creditLimit ?? DEFAULT_CLIENT_FORM_VALUES.creditLimit,
    paymentCondition: client?.paymentCondition ?? DEFAULT_CLIENT_FORM_VALUES.paymentCondition,
    accountStatus: client?.accountStatus ?? DEFAULT_CLIENT_FORM_VALUES.accountStatus,
    notes: client?.notes ?? DEFAULT_CLIENT_FORM_VALUES.notes,
    addressType: client?.addressType ?? DEFAULT_CLIENT_FORM_VALUES.addressType,
    street: client?.street ?? DEFAULT_CLIENT_FORM_VALUES.street,
    streetNumber: client?.streetNumber ?? DEFAULT_CLIENT_FORM_VALUES.streetNumber,
    city: client?.city ?? DEFAULT_CLIENT_FORM_VALUES.city,
    province: client?.province ?? DEFAULT_CLIENT_FORM_VALUES.province,
    postalCode: client?.postalCode ?? DEFAULT_CLIENT_FORM_VALUES.postalCode,
    country: client?.country ?? DEFAULT_CLIENT_FORM_VALUES.country,
    references: client?.references ?? DEFAULT_CLIENT_FORM_VALUES.references,
    isDefault: client?.isDefault ?? DEFAULT_CLIENT_FORM_VALUES.isDefault,
  };
}
