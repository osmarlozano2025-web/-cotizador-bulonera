import type { BranchId, CompanyId, ProductId, QuoteId, QuoteItemId, UserId } from "@/domain/shared";
import type { Quote, QuoteItem, QuoteStatus } from "@/domain/quote/quote";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import type { QuoteConversionPreview, QuoteDetailData, QuoteHistoryEntry, QuoteListResult, QuoteProductOption, QuoteReferenceData } from "../types";
import { calculateQuoteTotals, isQuoteConvertible, requiresQuoteAuthorization } from "../utils/quote-calculations";
import { getQuoteStatusLabel } from "../utils/quote-labels";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();

export const MOCK_QUOTE_COMPANY_ID = asId<CompanyId>("company-cba");
export const MOCK_QUOTE_USER_ID = asId<UserId>("user-quotes");
export const MOCK_QUOTE_BRANCH_ID = asId<BranchId>("branch-central");

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export const MOCK_QUOTE_PRODUCTS: readonly QuoteProductOption[] = [
  { id: asId<ProductId>("product-manicurador"), code: "PRD-001", name: "Tornillo autoperforante 8x1", basePrice: 180, unitLabel: "unidad" },
  { id: asId<ProductId>("product-arandela"), code: "PRD-002", name: "Arandela zincada 8 mm", basePrice: 65, unitLabel: "unidad" },
  { id: asId<ProductId>("product-taquito"), code: "PRD-003", name: "Taquito plástico 8 mm", basePrice: 45, unitLabel: "unidad" },
  { id: asId<ProductId>("product-bulon"), code: "PRD-004", name: "Bulón hexagonal 1/2 x 4", basePrice: 320, unitLabel: "unidad" },
  { id: asId<ProductId>("product-tuerca"), code: "PRD-005", name: "Tuerca autofrenante 1/2", basePrice: 110, unitLabel: "unidad" },
  { id: asId<ProductId>("product-rondana"), code: "PRD-006", name: "Rondana plana 1/2", basePrice: 58, unitLabel: "unidad" },
  { id: asId<ProductId>("product-varilla"), code: "PRD-007", name: "Varilla roscada galvanizada", basePrice: 840, unitLabel: "metro" },
  { id: asId<ProductId>("product-fijador"), code: "PRD-008", name: "Adhesivo fijador industrial", basePrice: 1450, unitLabel: "unidad" },
  { id: asId<ProductId>("product-lija"), code: "PRD-009", name: "Lija al agua grano 120", basePrice: 210, unitLabel: "unidad" },
  { id: asId<ProductId>("product-punta"), code: "PRD-010", name: "Punta para metal HSS", basePrice: 980, unitLabel: "unidad" },
  { id: asId<ProductId>("product-tubo"), code: "PRD-011", name: "Tubo estructural 40x40", basePrice: 3200, unitLabel: "metro" },
  { id: asId<ProductId>("product-sellador"), code: "PRD-012", name: "Sellador poliuretánico", basePrice: 2380, unitLabel: "unidad" },
] as const;

interface QuoteSeedItem {
  readonly productIndex: number;
  readonly quantity: number;
  readonly discountPercentage: number;
}

interface QuoteSeed {
  readonly clientIndex: number;
  readonly sellerIndex: number;
  readonly status: QuoteStatus;
  readonly createdOffsetDays: number;
  readonly validityOffsetDays: number;
  readonly items: readonly QuoteSeedItem[];
  readonly notes?: string;
  readonly commercialConditions?: string;
}

interface QuoteRecord {
  readonly quote: Quote;
  readonly detail: QuoteDetailData;
}

const QUOTE_SEEDS: readonly QuoteSeed[] = [
  { clientIndex: 0, sellerIndex: 0, status: "accepted", createdOffsetDays: 24, validityOffsetDays: 18, items: [{ productIndex: 0, quantity: 5, discountPercentage: 5 }, { productIndex: 1, quantity: 12, discountPercentage: 0 }], notes: "Aprobada por cliente habitual.", commercialConditions: "Pago a 30 días." },
  { clientIndex: 1, sellerIndex: 1, status: "sent", createdOffsetDays: 23, validityOffsetDays: 10, items: [{ productIndex: 3, quantity: 4, discountPercentage: 8 }, { productIndex: 5, quantity: 15, discountPercentage: 0 }], commercialConditions: "Oferta enviada por mail." },
  { clientIndex: 2, sellerIndex: 2, status: "pendingApproval", createdOffsetDays: 22, validityOffsetDays: 7, items: [{ productIndex: 10, quantity: 2, discountPercentage: 18 }, { productIndex: 7, quantity: 3, discountPercentage: 12 }], notes: "Excede umbral de descuento." },
  { clientIndex: 3, sellerIndex: 3, status: "draft", createdOffsetDays: 21, validityOffsetDays: 14, items: [{ productIndex: 8, quantity: 20, discountPercentage: 0 }, { productIndex: 9, quantity: 6, discountPercentage: 5 }], notes: "Borrador inicial del vendedor." },
  { clientIndex: 4, sellerIndex: 0, status: "rejected", createdOffsetDays: 20, validityOffsetDays: 12, items: [{ productIndex: 2, quantity: 50, discountPercentage: 10 }, { productIndex: 4, quantity: 30, discountPercentage: 0 }], notes: "Rechazada por precio." },
  { clientIndex: 5, sellerIndex: 1, status: "expired", createdOffsetDays: 19, validityOffsetDays: -1, items: [{ productIndex: 6, quantity: 8, discountPercentage: 0 }, { productIndex: 11, quantity: 2, discountPercentage: 7 }], notes: "Venció sin respuesta." },
  { clientIndex: 6, sellerIndex: 2, status: "converted", createdOffsetDays: 18, validityOffsetDays: 9, items: [{ productIndex: 1, quantity: 40, discountPercentage: 3 }, { productIndex: 4, quantity: 18, discountPercentage: 0 }, { productIndex: 0, quantity: 25, discountPercentage: 2 }], commercialConditions: "Convertida en pedido interno." },
  { clientIndex: 7, sellerIndex: 3, status: "cancelled", createdOffsetDays: 17, validityOffsetDays: 15, items: [{ productIndex: 9, quantity: 3, discountPercentage: 0 }, { productIndex: 11, quantity: 1, discountPercentage: 0 }], notes: "Cancelada por el cliente." },
  { clientIndex: 8, sellerIndex: 0, status: "accepted", createdOffsetDays: 16, validityOffsetDays: 13, items: [{ productIndex: 2, quantity: 120, discountPercentage: 15 }, { productIndex: 3, quantity: 8, discountPercentage: 10 }], commercialConditions: "Retiro en sucursal." },
  { clientIndex: 9, sellerIndex: 1, status: "sent", createdOffsetDays: 15, validityOffsetDays: 8, items: [{ productIndex: 7, quantity: 6, discountPercentage: 0 }, { productIndex: 8, quantity: 10, discountPercentage: 5 }], notes: "Pendiente de confirmación." },
  { clientIndex: 10, sellerIndex: 2, status: "pendingApproval", createdOffsetDays: 14, validityOffsetDays: 11, items: [{ productIndex: 10, quantity: 1, discountPercentage: 20 }, { productIndex: 11, quantity: 2, discountPercentage: 10 }], commercialConditions: "Requiere autorización comercial." },
  { clientIndex: 11, sellerIndex: 3, status: "draft", createdOffsetDays: 13, validityOffsetDays: 16, items: [{ productIndex: 0, quantity: 60, discountPercentage: 5 }, { productIndex: 5, quantity: 24, discountPercentage: 0 }], notes: "Pendiente de revisión interna." },
  { clientIndex: 0, sellerIndex: 0, status: "accepted", createdOffsetDays: 12, validityOffsetDays: 20, items: [{ productIndex: 6, quantity: 2, discountPercentage: 5 }, { productIndex: 1, quantity: 30, discountPercentage: 0 }], commercialConditions: "Aprobada por el supervisor." },
  { clientIndex: 1, sellerIndex: 1, status: "rejected", createdOffsetDays: 11, validityOffsetDays: 6, items: [{ productIndex: 4, quantity: 70, discountPercentage: 12 }, { productIndex: 9, quantity: 12, discountPercentage: 0 }], notes: "Cliente priorizó otro proveedor." },
  { clientIndex: 2, sellerIndex: 2, status: "expired", createdOffsetDays: 10, validityOffsetDays: -3, items: [{ productIndex: 3, quantity: 5, discountPercentage: 8 }, { productIndex: 8, quantity: 4, discountPercentage: 0 }], notes: "Vencida antes de revisión." },
  { clientIndex: 3, sellerIndex: 3, status: "converted", createdOffsetDays: 9, validityOffsetDays: 18, items: [{ productIndex: 10, quantity: 3, discountPercentage: 6 }, { productIndex: 11, quantity: 1, discountPercentage: 0 }], commercialConditions: "Pedido generado desde la cotización." },
  { clientIndex: 4, sellerIndex: 0, status: "sent", createdOffsetDays: 8, validityOffsetDays: 10, items: [{ productIndex: 2, quantity: 90, discountPercentage: 0 }, { productIndex: 7, quantity: 1, discountPercentage: 15 }], notes: "Cotización exportada al cliente." },
  { clientIndex: 5, sellerIndex: 1, status: "pendingApproval", createdOffsetDays: 7, validityOffsetDays: 12, items: [{ productIndex: 6, quantity: 10, discountPercentage: 18 }, { productIndex: 4, quantity: 40, discountPercentage: 0 }], notes: "Descuento bajo revisión." },
  { clientIndex: 6, sellerIndex: 2, status: "accepted", createdOffsetDays: 6, validityOffsetDays: 14, items: [{ productIndex: 1, quantity: 120, discountPercentage: 3 }, { productIndex: 0, quantity: 80, discountPercentage: 4 }], commercialConditions: "Entrega parcial programada." },
  { clientIndex: 7, sellerIndex: 3, status: "draft", createdOffsetDays: 5, validityOffsetDays: 21, items: [{ productIndex: 8, quantity: 18, discountPercentage: 0 }, { productIndex: 9, quantity: 6, discountPercentage: 0 }], notes: "Presupuesto interno." },
  { clientIndex: 8, sellerIndex: 0, status: "cancelled", createdOffsetDays: 4, validityOffsetDays: 9, items: [{ productIndex: 10, quantity: 1, discountPercentage: 0 }, { productIndex: 11, quantity: 2, discountPercentage: 0 }], notes: "Anulada por modificación de obra." },
  { clientIndex: 9, sellerIndex: 1, status: "accepted", createdOffsetDays: 3, validityOffsetDays: 17, items: [{ productIndex: 5, quantity: 50, discountPercentage: 2 }, { productIndex: 6, quantity: 5, discountPercentage: 0 }], commercialConditions: "Precio especial por volumen." },
  { clientIndex: 10, sellerIndex: 2, status: "sent", createdOffsetDays: 2, validityOffsetDays: 11, items: [{ productIndex: 7, quantity: 4, discountPercentage: 6 }, { productIndex: 3, quantity: 7, discountPercentage: 0 }], notes: "Pendiente de devolución." },
  { clientIndex: 11, sellerIndex: 3, status: "pendingApproval", createdOffsetDays: 1, validityOffsetDays: 13, items: [{ productIndex: 10, quantity: 4, discountPercentage: 22 }, { productIndex: 2, quantity: 100, discountPercentage: 5 }], notes: "Excede descuento autorizado." },
  { clientIndex: 0, sellerIndex: 0, status: "accepted", createdOffsetDays: 0, validityOffsetDays: 19, items: [{ productIndex: 0, quantity: 12, discountPercentage: 0 }, { productIndex: 1, quantity: 24, discountPercentage: 0 }, { productIndex: 4, quantity: 8, discountPercentage: 5 }], commercialConditions: "Lista general vigente." },
] as const;

function offsetDays(base: Date, days: number): string {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return toIso(next);
}

function buildQuoteNumber(index: number): string {
  return `COT-2025-${String(index + 1).padStart(4, "0")}`;
}

function buildQuoteItems(quoteId: QuoteId, seedItems: readonly QuoteSeedItem[], seedIndex: number): readonly QuoteItem[] {
  return seedItems.map((seedItem, itemIndex) => {
    const product = requireDefined(MOCK_QUOTE_PRODUCTS[seedItem.productIndex], "No se pudo cargar un producto simulado.");
    const quantity = seedItem.quantity;
    const unitPrice = Math.round(product.basePrice * (1 + ((seedIndex + itemIndex) % 4) * 0.03));
    const discountPercentage = seedItem.discountPercentage;
    const discountAmount = Math.round((quantity * unitPrice * discountPercentage / 100) * 100) / 100;
    const lineTotal = Math.round((quantity * unitPrice - discountAmount) * 100) / 100;

    return {
      id: asId<QuoteItemId>(`quote-item-${seedIndex + 1}-${itemIndex + 1}`),
      quoteId,
      productId: product.id,
      description: product.name,
      quantity,
      unitPrice,
      discountPercentage,
      discountAmount,
      lineTotal,
    };
  });
}

function buildQuoteHistory(number: string, status: QuoteStatus, createdAt: string, updatedAt: string): readonly QuoteHistoryEntry[] {
  return [
    { id: `${number}-history-1`, date: createdAt, title: "Cotización creada", description: "Se generó la cotización desde el módulo comercial.", status: "draft" },
    { id: `${number}-history-2`, date: updatedAt, title: "Estado actualizado", description: `La cotización pasó al estado ${getQuoteStatusLabel(status).toLowerCase()}.`, status },
  ];
}

function buildQuoteRecord(seed: QuoteSeed, index: number): QuoteRecord {
  const client = requireDefined(MOCK_CLIENTS[seed.clientIndex], "No se pudo cargar un cliente simulado.");
  const seller = requireDefined(MOCK_SELLERS[seed.sellerIndex], "No se pudo cargar un vendedor simulado.");
  const baseDate = new Date("2025-07-01T09:00:00.000Z");
  const createdAt = offsetDays(baseDate, -seed.createdOffsetDays);
  const updatedAt = offsetDays(baseDate, -Math.max(seed.createdOffsetDays - 1, 0));
  const validUntil = offsetDays(baseDate, seed.validityOffsetDays);
  const quoteId = asId<QuoteId>(`quote-${index + 1}`);
  const number = buildQuoteNumber(index);
  const items = buildQuoteItems(quoteId, seed.items, index);
  const totals = calculateQuoteTotals(items);
  const quote: Quote = {
    id: quoteId,
    companyId: MOCK_QUOTE_COMPANY_ID,
    branchId: client.branchId,
    clientId: client.id,
    sellerId: seller.id,
    number,
    status: seed.status,
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    currency: "ARS",
    validUntil,
    ...(seed.notes !== undefined ? { notes: seed.notes } : {}),
    ...(seed.commercialConditions !== undefined ? { commercialConditions: seed.commercialConditions } : {}),
    createdBy: MOCK_QUOTE_USER_ID,
    createdAt,
    updatedAt,
  };
  const productNames = items.map((item) => item.description);
  const history = buildQuoteHistory(number, seed.status, createdAt, updatedAt);
  const detail: QuoteDetailData = {
    quote,
    clientName: client.legalName,
    productNames,
    totals,
    history,
    authorizationRequired: requiresQuoteAuthorization(quote),
    ...(seller.label.length > 0 ? { sellerName: seller.label } : {}),
  };

  return { quote, detail };
}

const QUOTE_RECORDS: readonly QuoteRecord[] = QUOTE_SEEDS.map((seed, index) => buildQuoteRecord(seed, index));
const QUOTE_RECORD_MAP = new Map(QUOTE_RECORDS.map((record) => [record.quote.id, record] as const));

export const MOCK_QUOTES: readonly Quote[] = QUOTE_RECORDS.map((record) => record.quote);

export function getQuoteReferenceData(): QuoteReferenceData {
  return {
    clientOptions: MOCK_CLIENTS.map((client) => ({ id: client.id, label: `${client.code} · ${client.legalName}` })),
    sellerOptions: MOCK_SELLERS,
    productOptions: MOCK_QUOTE_PRODUCTS,
  };
}

export function getQuoteSeedList(): readonly Quote[] {
  return MOCK_QUOTES;
}

export function getMockQuoteDetail(quote: Quote): QuoteDetailData {
  const record = QUOTE_RECORD_MAP.get(quote.id);
  if (record !== undefined) {
    return {
      ...record.detail,
      quote,
      totals: calculateQuoteTotals(quote.items),
      authorizationRequired: requiresQuoteAuthorization(quote),
    };
  }

  const client = MOCK_CLIENTS.find((item) => item.id === quote.clientId);
  const seller = MOCK_SELLERS.find((item) => item.id === quote.sellerId);
  const totals = calculateQuoteTotals(quote.items);
  const history = buildQuoteHistory(quote.number, quote.status, quote.createdAt, quote.updatedAt);

  return {
    quote,
    clientName: client?.legalName ?? "Cliente no encontrado",
    ...(seller?.label !== undefined ? { sellerName: seller.label } : {}),
    productNames: quote.items.map((item) => item.description),
    totals,
    history,
    authorizationRequired: requiresQuoteAuthorization(quote),
  };
}

export function buildQuoteConversionPreview(quote: Quote): QuoteConversionPreview {
  if (!isQuoteConvertible(quote)) {
    return {
      canConvert: false,
      message: "La cotización no puede convertirse todavía.",
    };
  }

  const preparedOrderDraft = {
    companyId: quote.companyId,
    branchId: quote.branchId,
    clientId: quote.clientId,
    sourceQuoteId: quote.id,
    status: "draft" as const,
    items: quote.items.map((item) => ({
      sourceQuoteItemId: item.id,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
    })),
    ...calculateQuoteTotals(quote.items),
    currency: quote.currency,
    paymentCondition: quote.commercialConditions ?? "",
    requiresApproval: false,
    createdBy: quote.createdBy,
    ...(quote.sellerId !== undefined ? { sellerId: quote.sellerId } : {}),
    ...(quote.notes !== undefined ? { notes: quote.notes } : {}),
  };

  return {
    canConvert: true,
    message: "La simulación del pedido quedó preparada correctamente.",
    preparedOrderDraft,
    convertedAt: new Date().toISOString(),
  };
}

export function summarizeQuoteList(quotes: readonly Quote[]): QuoteListResult {
  return {
    items: quotes,
    total: quotes.length,
    page: 1,
    pageSize: quotes.length,
  };
}
