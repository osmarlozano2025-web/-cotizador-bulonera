import type { BranchId, ClientId, CompanyId, OrderId, OrderItemId, UserId } from "@/domain/shared";
import type { Order, OrderItem, OrderStatus } from "@/domain/order/order";
import type { Quote } from "@/domain/quote/quote";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import { MOCK_QUOTES, MOCK_QUOTE_PRODUCTS } from "@/features/quotes/data/mock-quotes";
import type {
  OrderAuthorizationSummary,
  OrderDetailData,
  OrderDispatchStatus,
  OrderDispatchSummary,
  OrderHistoryEntry,
  OrderProductOption,
  OrderReferenceData,
  OrderTangoStatus,
  OrderTangoSummary,
} from "../types";
import { calculateOrderTotals, evaluateOrderAuthorization, mapOrderLineToTotalsInput } from "../utils/order-calculations";
import { getDispatchStatusLabel, getOrderStatusLabel, getTangoStatusLabel } from "../utils/order-labels";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();

function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

function getDeliveryAddressLabel(clientId: ClientId, deliveryAddressId?: string): string | undefined {
  if (deliveryAddressId === undefined) {
    return undefined;
  }

  const client = MOCK_CLIENTS.find((item) => item.id === clientId);
  const address = client?.addresses.find((entry) => entry.id === deliveryAddressId);
  if (address === undefined) {
    return undefined;
  }

  return `${address.street}${address.number !== undefined ? ` ${address.number}` : ""}, ${address.city}`;
}

export const MOCK_ORDER_COMPANY_ID = asId<CompanyId>("company-cba");
export const MOCK_ORDER_USER_ID = asId<UserId>("user-orders");
export const MOCK_ORDER_BRANCH_ID = asId<BranchId>("branch-central");

export const MOCK_ORDER_PRODUCTS: readonly OrderProductOption[] = MOCK_QUOTE_PRODUCTS.map((product) => ({
  id: product.id,
  code: product.code,
  name: product.name,
  basePrice: product.basePrice,
  unitLabel: product.unitLabel,
}));

interface OrderSeedItem {
  readonly productIndex: number;
  readonly quantity: number;
  readonly discountPercentage: number;
  readonly notes: string;
}

interface OrderSeed {
  readonly clientIndex: number;
  readonly sellerIndex: number;
  readonly status: OrderStatus;
  readonly dispatchStatus: OrderDispatchStatus;
  readonly tangoStatus: OrderTangoStatus;
  readonly createdOffsetDays: number;
  readonly paymentCondition: string;
  readonly items: readonly OrderSeedItem[];
  readonly sourceQuoteIndex?: number;
}

interface OrderRecord {
  readonly order: Order;
  readonly detail: OrderDetailData;
}

const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  "draft",
  "pendingApproval",
  "approved",
  "preparing",
  "prepared",
  "readyForDispatch",
  "dispatched",
  "delivered",
  "sentToTango",
  "invoiced",
  "cancelled",
];

const DISPATCH_SEQUENCE: readonly OrderDispatchStatus[] = ["pending", "preparing", "prepared", "ready", "dispatched"];
const TANGO_SEQUENCE: readonly OrderTangoStatus[] = ["pending", "processing", "sent", "error"];

const ACCEPTED_QUOTES = MOCK_QUOTES.filter((quote) => quote.status === "accepted");

const ORDER_SEEDS: readonly OrderSeed[] = Array.from({ length: 30 }, (_, index) => {
  const quote = index % 3 === 0 ? ACCEPTED_QUOTES[index % ACCEPTED_QUOTES.length] : undefined;
  const status = requireDefined(ORDER_STATUS_SEQUENCE[index % ORDER_STATUS_SEQUENCE.length], "No se pudo construir un estado simulado.");
  const dispatchStatus = requireDefined(DISPATCH_SEQUENCE[index % DISPATCH_SEQUENCE.length], "No se pudo construir un estado de despacho simulado.");
  const tangoStatus = requireDefined(TANGO_SEQUENCE[index % TANGO_SEQUENCE.length], "No se pudo construir un estado de Tango simulado.");
  const items =
    quote === undefined
      ? [
          {
            productIndex: index % MOCK_ORDER_PRODUCTS.length,
            quantity: 2 + (index % 6),
            discountPercentage: (index % 4) * 5,
            notes: index % 2 === 0 ? "Sin observaciones." : "Atención al embalaje.",
          },
          {
            productIndex: (index + 3) % MOCK_ORDER_PRODUCTS.length,
            quantity: 1 + (index % 5),
            discountPercentage: index % 3 === 0 ? 8 : 0,
            notes: "Línea complementaria.",
          },
        ]
      : quote.items.map((item, lineIndex) => ({
          productIndex: Math.max(0, MOCK_ORDER_PRODUCTS.findIndex((product) => product.id === item.productId)),
          quantity: item.quantity,
          discountPercentage: lineIndex === 0 ? item.discountPercentage : Math.max(0, item.discountPercentage - 2),
          notes: lineIndex === 0 ? "Recuperado desde cotización." : "Conserva el precio negociado.",
        }));

  return {
    clientIndex: index % MOCK_CLIENTS.length,
    sellerIndex: index % MOCK_SELLERS.length,
    status,
    dispatchStatus,
    tangoStatus,
    createdOffsetDays: 30 - index,
    paymentCondition: index % 2 === 0 ? "Contado" : "30 días",
    items,
    ...(quote !== undefined ? { sourceQuoteIndex: ACCEPTED_QUOTES.findIndex((acceptedQuote) => acceptedQuote.id === quote.id) } : {}),
  };
});

function buildQuoteByIndex(index?: number): Quote | undefined {
  if (index === undefined || index < 0) {
    return undefined;
  }

  return ACCEPTED_QUOTES[index];
}

function createOrderItems(seedItems: readonly OrderSeedItem[], orderId: OrderId): readonly OrderItem[] {
  return seedItems.map((seedItem, index) => {
    const product = requireDefined(MOCK_ORDER_PRODUCTS[seedItem.productIndex], "No se pudo cargar un producto de pedido simulado.");
    const quantity = seedItem.quantity;
    const unitPrice = Math.round(product.basePrice * (1 + (index % 3) * 0.05));
    const discountAmount = Math.round(((quantity * unitPrice * seedItem.discountPercentage) / 100) * 100) / 100;
    const lineTotal = Math.round((quantity * unitPrice - discountAmount) * 100) / 100;

    return {
      id: asId<OrderItemId>(`order-item-${orderId}-${index + 1}`),
      orderId,
      productId: product.id,
      description: product.name,
      quantity,
      unitPrice,
      discountPercentage: seedItem.discountPercentage,
      discountAmount,
      lineTotal,
    };
  });
}

function createHistory(number: string, status: OrderStatus, createdAt: string, updatedAt: string): readonly OrderHistoryEntry[] {
  return [
    { id: `${number}-history-1`, date: createdAt, title: "Pedido creado", description: "Se registró el pedido en el circuito comercial.", status: "draft" },
    { id: `${number}-history-2`, date: updatedAt, title: "Estado actualizado", description: `El pedido pasó al estado ${getOrderStatusLabel(status).toLowerCase()}.`, status },
  ];
}

function buildDispatchSummary(status: OrderDispatchStatus, updatedAt: string): OrderDispatchSummary {
  return {
    status,
    label: getDispatchStatusLabel(status),
    updatedAt,
  };
}

function buildTangoSummary(status: OrderTangoStatus, updatedAt: string): OrderTangoSummary {
  return {
    status,
    label: getTangoStatusLabel(status),
    updatedAt,
  };
}

function buildOrderRecord(seed: OrderSeed, index: number): OrderRecord {
  const client = requireDefined(MOCK_CLIENTS[seed.clientIndex], "No se pudo cargar un cliente simulado.");
  const seller = requireDefined(MOCK_SELLERS[seed.sellerIndex], "No se pudo cargar un vendedor simulado.");
  const quote = buildQuoteByIndex(seed.sourceQuoteIndex);
  const baseDate = new Date("2025-07-01T09:00:00.000Z");
  const createdAt = toIso(new Date(baseDate.getTime() - seed.createdOffsetDays * 24 * 60 * 60 * 1000));
  const updatedAt = toIso(new Date(new Date(createdAt).getTime() + 60 * 60 * 1000));
  const orderId = asId<OrderId>(`order-${index + 1}`);
  const number = `PED-2025-${String(index + 1).padStart(4, "0")}`;
  const items = createOrderItems(seed.items, orderId);
  const totals = calculateOrderTotals(items.map(mapOrderLineToTotalsInput));
  const deliveryAddressLabel = getDeliveryAddressLabel(client.id, client.addresses[0]?.id);
  const order: Order = {
    id: orderId,
    companyId: MOCK_ORDER_COMPANY_ID,
    branchId: client.branchId,
    clientId: client.id,
    sellerId: seller.id,
    ...(quote !== undefined ? { sourceQuoteId: quote.id } : {}),
    number,
    status: seed.status,
    items,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    currency: "ARS",
    paymentCondition: seed.paymentCondition,
    ...(client.addresses[0] !== undefined ? { deliveryAddressId: client.addresses[0].id } : {}),
    notes: `Pedido simulado ${index + 1}.`,
    requiresApproval: seed.status === "pendingApproval",
    createdBy: MOCK_ORDER_USER_ID,
    createdAt,
    updatedAt,
  };
  const authorization = evaluateOrderAuthorization(client, totals.total, items.map((item) => item.discountPercentage));
  const detail: OrderDetailData = {
    order,
    clientName: client.legalName,
    ...(seller.label.length > 0 ? { sellerName: seller.label } : {}),
    ...(deliveryAddressLabel !== undefined ? { deliveryAddressLabel } : {}),
    ...(quote !== undefined ? { sourceQuoteNumber: quote.number } : {}),
    totals,
    history: createHistory(number, seed.status, createdAt, updatedAt),
    authorization,
    dispatch: buildDispatchSummary(seed.dispatchStatus, updatedAt),
    tango: buildTangoSummary(seed.tangoStatus, updatedAt),
    creditSnapshot: authorization.creditSnapshot,
    clientCommercialStatus: client.commercialStatus,
    clientAccountStatus: client.accountStatus,
    clientBlocked: client.status === "blocked" || client.commercialStatus === "blocked",
  };

  return { order, detail };
}

export const MOCK_ORDER_RECORDS: readonly OrderRecord[] = ORDER_SEEDS.map((seed, index) => buildOrderRecord(seed, index));
export const MOCK_ORDERS: readonly Order[] = MOCK_ORDER_RECORDS.map((record) => record.order);

export function getOrderReferenceData(): OrderReferenceData {
  const addressesByClientId = Object.fromEntries(
    MOCK_CLIENTS.map((client) => [
      client.id,
      client.addresses.map((address) => ({
        id: address.id,
        label: `${address.street}${address.number !== undefined ? ` ${address.number}` : ""}, ${address.city}`,
      })),
    ]),
  ) as OrderReferenceData["addressesByClientId"];

  return {
    clientOptions: MOCK_CLIENTS.map((client) => ({
      id: client.id,
      label: `${client.code} · ${client.legalName}`,
      commercialStatus: client.commercialStatus,
      status: client.accountStatus,
    })),
    sellerOptions: MOCK_SELLERS,
    productOptions: MOCK_ORDER_PRODUCTS,
    addressesByClientId,
    quoteOptions: ACCEPTED_QUOTES.map((quote) => ({
      id: quote.id,
      label: `${quote.number} · ${MOCK_CLIENTS.find((client) => client.id === quote.clientId)?.legalName ?? "Cliente no encontrado"}`,
    })),
  };
}

export function getOrderSeedList(): readonly Order[] {
  return MOCK_ORDERS;
}

export function getMockOrderDetail(order: Order): OrderDetailData {
  const record = MOCK_ORDER_RECORDS.find((item) => item.order.id === order.id);
  if (record !== undefined) {
    return {
      ...record.detail,
      order,
      totals: calculateOrderTotals(order.items.map(mapOrderLineToTotalsInput)),
    };
  }

  const client = MOCK_CLIENTS.find((item) => item.id === order.clientId);
  const seller = MOCK_SELLERS.find((item) => item.id === order.sellerId);
  const deliveryAddressLabel = getDeliveryAddressLabel(order.clientId, order.deliveryAddressId);
  const totals = calculateOrderTotals(order.items.map(mapOrderLineToTotalsInput));
  const authorization: OrderAuthorizationSummary =
    client !== undefined
      ? evaluateOrderAuthorization(client, totals.total, order.items.map((item) => item.discountPercentage))
      : {
          required: false,
          status: "notRequired" as const,
          reasons: [],
          creditSnapshot: {
            clientId: order.clientId,
            totalDebt: { amount: 0, currency: order.currency },
            overdueDebt: { amount: 0, currency: order.currency },
            creditLimit: { amount: 0, currency: order.currency },
            daysPastDue: 0,
            isBlocked: false,
            lastUpdatedAt: order.updatedAt,
          },
        };

  return {
    order,
    clientName: client?.legalName ?? "Cliente no encontrado",
    ...(seller?.label !== undefined ? { sellerName: seller.label } : {}),
    ...(deliveryAddressLabel !== undefined ? { deliveryAddressLabel } : {}),
    ...(order.sourceQuoteId !== undefined
      ? {
          sourceQuoteNumber: requireDefined(
            MOCK_QUOTES.find((quote) => quote.id === order.sourceQuoteId)?.number,
            "No se pudo resolver la cotización origen.",
          ),
        }
      : {}),
    totals,
    history: createHistory(order.number, order.status, order.createdAt, order.updatedAt),
    authorization,
    dispatch: buildDispatchSummary(order.status === "prepared" ? "ready" : "pending", order.updatedAt),
    tango: buildTangoSummary(order.status === "sentToTango" ? "sent" : "pending", order.updatedAt),
    creditSnapshot: authorization.creditSnapshot,
    clientCommercialStatus: client?.commercialStatus ?? "active",
    clientAccountStatus: client?.accountStatus ?? "current",
    clientBlocked: client?.status === "blocked" || client?.commercialStatus === "blocked" || false,
  };
}
