import type { Client } from "@/domain/client/client";
import type { Order } from "@/domain/order/order";
import type { ClientAddressId, OrderId, QuoteId, SellerId } from "@/domain/shared";
import { canTransitionOrderStatus } from "@/domain/shared/state-transitions";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import { MOCK_QUOTES } from "@/features/quotes/data/mock-quotes";
import type { Quote } from "@/domain/quote/quote";
import { getMockOrderDetail, MOCK_ORDER_BRANCH_ID, MOCK_ORDER_COMPANY_ID, MOCK_ORDER_USER_ID } from "../data/mock-orders";
import type {
  OrderAuthorizationSummary,
  OrderCreateResult,
  OrderDetailData,
  OrderFormValues,
  OrderListQuery,
  OrderListResult,
  OrderLookupResult,
  OrderTangoStatus,
} from "../types";
import { calculateOrderTotals, evaluateOrderAuthorization } from "../utils/order-calculations";
import { getDispatchStatusLabel, getOrderStatusLabel, getTangoStatusLabel } from "../utils/order-labels";
import type { OrderRepository } from "./order-repository";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

function cloneOrder(order: Order): Order {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item })),
  };
}

function cloneDetail(detail: OrderDetailData): OrderDetailData {
  return {
    ...detail,
    order: cloneOrder(detail.order),
    history: detail.history.map((entry) => ({ ...entry })),
    totals: { ...detail.totals },
    authorization: {
      ...detail.authorization,
      creditSnapshot: {
        ...detail.authorization.creditSnapshot,
        totalDebt: { ...detail.authorization.creditSnapshot.totalDebt },
        overdueDebt: { ...detail.authorization.creditSnapshot.overdueDebt },
        creditLimit: { ...detail.authorization.creditSnapshot.creditLimit },
      },
    },
    dispatch: { ...detail.dispatch },
    tango: { ...detail.tango },
  };
}

function deriveDispatchStatus(order: Order): OrderDetailData["dispatch"]["status"] {
  switch (order.status) {
    case "preparing":
      return "preparing";
    case "prepared":
      return "prepared";
    case "readyForDispatch":
      return "ready";
    case "dispatched":
    case "delivered":
    case "sentToTango":
    case "invoiced":
      return "dispatched";
    default:
      return "pending";
  }
}

function deriveTangoStatus(order: Order): OrderTangoStatus {
  switch (order.status) {
    case "sentToTango":
      return "processing";
    case "invoiced":
      return "sent";
    case "cancelled":
      return "error";
    default:
      return "pending";
  }
}

function deriveAuthorizationStatus(order: Order, authorizationRequired: boolean): OrderAuthorizationSummary["status"] {
  if (!authorizationRequired) {
    return "notRequired";
  }

  switch (order.status) {
    case "pendingApproval":
      return "pending";
    case "approved":
    case "preparing":
    case "prepared":
    case "readyForDispatch":
    case "dispatched":
    case "delivered":
    case "sentToTango":
    case "invoiced":
      return "approved";
    case "cancelled":
      return "rejected";
    default:
      return "pending";
  }
}

function buildHistoryEntry(order: Order, title: string, description: string): OrderDetailData["history"][number] {
  return {
    id: `${order.number}-${Date.now()}`,
    date: new Date().toISOString(),
    title,
    description,
    status: order.status,
  };
}

function getClient(clientId: Order["clientId"]): Client {
  const client = MOCK_CLIENTS.find((item) => item.id === clientId);
  if (client === undefined) {
    throw new Error("Cliente no encontrado.");
  }

  return client;
}

function getSeller(sellerId?: SellerId): string | undefined {
  if (sellerId === undefined) {
    return undefined;
  }

  return MOCK_SELLERS.find((seller) => seller.id === sellerId)?.label;
}

function getDeliveryAddressLabel(client: Client, deliveryAddressId?: ClientAddressId): string | undefined {
  if (deliveryAddressId === undefined) {
    return undefined;
  }

  const address = client.addresses.find((entry) => entry.id === deliveryAddressId);
  if (address === undefined) {
    return undefined;
  }

  return `${address.street}${address.number !== undefined ? ` ${address.number}` : ""}, ${address.city}`;
}

function getQuoteById(quoteId?: QuoteId): Quote | undefined {
  if (quoteId === undefined) {
    return undefined;
  }

  return MOCK_QUOTES.find((quote) => quote.id === quoteId);
}

function buildDetail(order: Order, previousDetail?: OrderDetailData, historyDescription?: string): OrderDetailData {
  const client = getClient(order.clientId);
  const sellerName = getSeller(order.sellerId);
  const nextDeliveryAddressLabel = getDeliveryAddressLabel(client, order.deliveryAddressId);
  const totals = {
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    total: order.total,
    itemsCount: order.items.length,
    unitsCount: order.items.reduce((total, item) => total + item.quantity, 0),
  };
  const authorization = evaluateOrderAuthorization(client, totals.total, order.items.map((item) => item.discountPercentage));
  const quote = getQuoteById(order.sourceQuoteId);
  const base = previousDetail ?? getMockOrderDetail(order);
  const { deliveryAddressLabel: existingDeliveryAddressLabel, ...baseWithoutAddressLabel } = base;
  void existingDeliveryAddressLabel;
  const history =
    previousDetail !== undefined && historyDescription !== undefined
      ? [...previousDetail.history, buildHistoryEntry(order, "Pedido actualizado", historyDescription)]
      : base.history;

  return {
    ...baseWithoutAddressLabel,
    order,
    ...(sellerName !== undefined ? { sellerName } : {}),
    ...(quote !== undefined ? { sourceQuoteNumber: quote.number } : {}),
    ...(nextDeliveryAddressLabel !== undefined ? { deliveryAddressLabel: nextDeliveryAddressLabel } : {}),
    totals,
    history,
    authorization: {
      ...authorization,
      status: deriveAuthorizationStatus(order, authorization.required),
    },
    dispatch: {
      status: deriveDispatchStatus(order),
      label: getDispatchStatusLabel(deriveDispatchStatus(order)),
      updatedAt: order.updatedAt,
    },
    tango: {
      status: deriveTangoStatus(order),
      label: getTangoStatusLabel(deriveTangoStatus(order)),
      updatedAt: order.updatedAt,
    },
    creditSnapshot: authorization.creditSnapshot,
    clientCommercialStatus: client.commercialStatus,
    clientAccountStatus: client.accountStatus,
    clientBlocked: client.status === "blocked" || client.commercialStatus === "blocked",
  };
}

function createOrderNumber(sequence: number): string {
  return `PED-2025-${String(sequence).padStart(4, "0")}`;
}

function buildOrderFromForm(values: OrderFormValues, sequence: number, currentOrder?: Order, sourceQuote?: Quote): Order {
  const client = getClient(values.clientId as Order["clientId"]);
  const now = new Date().toISOString();
  const orderId = currentOrder?.id ?? (`order-${sequence}` as OrderId);
  const totals = calculateOrderTotals(values.items.map((item) => ({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercentage: item.discountPercentage,
  })));
  const authorization = evaluateOrderAuthorization(client, totals.total, values.items.map((item) => item.discountPercentage));
  const hasSourceQuote = sourceQuote !== undefined || values.sourceQuoteId.trim().length > 0;
  const status: Order["status"] =
    currentOrder !== undefined
      ? currentOrder.status === "draft" && authorization.required
        ? "pendingApproval"
        : currentOrder.status
      : authorization.required
        ? "pendingApproval"
        : hasSourceQuote
          ? "approved"
          : "draft";

  return {
    id: orderId,
    companyId: currentOrder?.companyId ?? MOCK_ORDER_COMPANY_ID,
    branchId: currentOrder?.branchId ?? MOCK_ORDER_BRANCH_ID,
    clientId: client.id,
    ...(values.sellerId.trim().length > 0 ? { sellerId: values.sellerId as SellerId } : {}),
    ...(sourceQuote !== undefined ? { sourceQuoteId: sourceQuote.id } : {}),
    ...(sourceQuote === undefined && currentOrder?.sourceQuoteId !== undefined ? { sourceQuoteId: currentOrder.sourceQuoteId } : {}),
    number: currentOrder?.number ?? createOrderNumber(sequence),
    status,
    items: values.items.map((item, index) => {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = Math.round(((subtotal * item.discountPercentage) / 100) * 100) / 100;
      return {
        id: `${orderId}-item-${index + 1}` as Order["items"][number]["id"],
        orderId,
        productId: item.productId as Order["items"][number]["productId"],
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount,
        lineTotal: Math.round((subtotal - discountAmount) * 100) / 100,
      };
    }),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    currency: currentOrder?.currency ?? "ARS",
    paymentCondition: values.paymentCondition,
    ...(values.deliveryAddressId.trim().length > 0 ? { deliveryAddressId: values.deliveryAddressId as ClientAddressId } : {}),
    ...(values.notes.trim().length > 0 ? { notes: values.notes.trim() } : {}),
    requiresApproval: authorization.required,
    createdBy: currentOrder?.createdBy ?? MOCK_ORDER_USER_ID,
    createdAt: currentOrder?.createdAt ?? now,
    updatedAt: now,
  };
}

function matchesSearch(detail: OrderDetailData, search: string): boolean {
  if (search.length === 0) {
    return true;
  }

  const normalized = search.toLowerCase();
  const searchText = [
    detail.order.number,
    detail.clientName,
    detail.sellerName ?? "",
    detail.order.status,
    getOrderStatusLabel(detail.order.status),
    detail.order.items.map((item) => item.description).join(" "),
    detail.sourceQuoteNumber ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return searchText.includes(normalized);
}

function matchesFilters(detail: OrderDetailData, query: OrderListQuery): boolean {
  const { filters } = query;
  const statusMatch = filters.status === "all" || detail.order.status === filters.status;
  const clientMatch = filters.clientId === "all" || detail.order.clientId === filters.clientId;
  const sellerMatch =
    filters.sellerId === "all"
    || (filters.sellerId === "unassigned" && detail.order.sellerId === undefined)
    || detail.order.sellerId === filters.sellerId;
  const currentDate = new Date();
  const createdAt = new Date(detail.order.createdAt);
  const dateRangeMatch =
    filters.dateRange === "all"
    || (filters.dateRange === "last30Days" && currentDate.getTime() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30)
    || (filters.dateRange === "currentMonth" && createdAt.getUTCMonth() === currentDate.getUTCMonth() && createdAt.getUTCFullYear() === currentDate.getUTCFullYear());
  const quickViewMatch =
    filters.quickView === "all"
    || (filters.quickView === "withDebt" && detail.authorization.required)
    || (filters.quickView === "pendingApproval" && detail.order.status === "pendingApproval")
    || (filters.quickView === "preparing" && (detail.order.status === "preparing" || detail.order.status === "prepared"))
    || (filters.quickView === "dispatch" && (detail.order.status === "readyForDispatch" || detail.order.status === "dispatched"))
    || (filters.quickView === "sentToTango" && detail.order.status === "sentToTango")
    || (filters.quickView === "invoiced" && detail.order.status === "invoiced");

  return statusMatch && clientMatch && sellerMatch && dateRangeMatch && quickViewMatch && matchesSearch(detail, filters.search);
}

export class MockOrderRepository implements OrderRepository {
  private readonly records: OrderDetailData[];
  private sequence: number;

  constructor(initialOrders: readonly Order[]) {
    this.records = initialOrders.map((order) => getMockOrderDetail(order)).map((detail) => cloneDetail(detail));
    this.sequence = initialOrders.length + 1;
  }

  async getOrders(query: OrderListQuery): Promise<OrderListResult> {
    await delay();
    const filtered = this.records.filter((record) => matchesFilters(record, query));
    const start = (query.page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize).map((record) => cloneOrder(record.order));

    return {
      items,
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getOrderById(orderId: OrderId): Promise<Order | null> {
    await delay(80);
    const record = this.records.find((item) => item.order.id === orderId);
    return record === undefined ? null : cloneOrder(record.order);
  }

  async getOrderDetailData(orderId: OrderId): Promise<OrderDetailData | null> {
    await delay(120);
    const record = this.records.find((item) => item.order.id === orderId);
    return record === undefined ? null : cloneDetail(record);
  }

  async getOrderLookup(orderId: OrderId): Promise<OrderLookupResult | null> {
    await delay(80);
    const record = this.records.find((item) => item.order.id === orderId);
    return record === undefined ? null : { order: cloneOrder(record.order), detail: cloneDetail(record) };
  }

  async createOrder(values: OrderFormValues, sourceQuoteId?: QuoteId): Promise<OrderCreateResult> {
    await delay();
    const nextQuoteId = sourceQuoteId ?? (values.sourceQuoteId.trim().length > 0 ? (values.sourceQuoteId as QuoteId) : undefined);
    const sourceQuote = getQuoteById(nextQuoteId);
    const order = buildOrderFromForm(values, this.sequence, undefined, sourceQuote);
    this.sequence += 1;
    const detail = buildDetail(order);
    this.records.unshift(detail);
    return { order: cloneOrder(order), detail: cloneDetail(detail) };
  }

  async updateOrder(orderId: OrderId, values: OrderFormValues): Promise<OrderCreateResult> {
    await delay();
    const recordIndex = this.records.findIndex((item) => item.order.id === orderId);
    if (recordIndex === -1) {
      throw new Error("Pedido no encontrado.");
    }

    const currentRecord = this.records[recordIndex]!;
    const nextQuoteId = values.sourceQuoteId.trim().length > 0 ? (values.sourceQuoteId as QuoteId) : currentRecord.order.sourceQuoteId;
    const sourceQuote = getQuoteById(nextQuoteId);
    const updatedOrder = buildOrderFromForm(values, this.sequence, currentRecord.order, sourceQuote);
    const updatedDetail = buildDetail(updatedOrder, currentRecord, "Se actualizó la información del pedido.");
    this.records[recordIndex] = updatedDetail;
    return { order: cloneOrder(updatedOrder), detail: cloneDetail(updatedDetail) };
  }

  async duplicateOrder(orderId: OrderId): Promise<OrderCreateResult> {
    await delay();
    const record = this.records.find((item) => item.order.id === orderId);
    if (record === undefined) {
      throw new Error("Pedido no encontrado.");
    }

    const duplicated = buildOrderFromForm(
      {
        clientId: record.order.clientId,
        sellerId: record.order.sellerId?.toString() ?? "",
        paymentCondition: record.order.paymentCondition,
        deliveryAddressId: record.order.deliveryAddressId?.toString() ?? "",
        notes: record.order.notes ?? "",
        sourceQuoteId: record.order.sourceQuoteId?.toString() ?? "",
        items: record.order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
          notes: "",
        })),
      },
      this.sequence,
      undefined,
      record.order.sourceQuoteId !== undefined ? getQuoteById(record.order.sourceQuoteId) : undefined,
    );
    this.sequence += 1;
    const duplicatedOrder: Order = {
      ...duplicated,
      status: duplicated.requiresApproval ? "pendingApproval" : "draft",
    };
    const detail = {
      ...buildDetail(duplicatedOrder),
      history: [
        {
          id: `${duplicatedOrder.number}-history-1`,
          date: duplicatedOrder.createdAt,
          title: "Pedido creado",
          description: "Se creó una nueva copia del pedido.",
          status: duplicatedOrder.status,
        },
        {
          id: `${duplicatedOrder.number}-history-2`,
          date: duplicatedOrder.updatedAt,
          title: "Pedido duplicado",
          description: `Se duplicó desde ${record.order.number}.`,
          status: duplicatedOrder.status,
        },
      ],
    };
    this.records.unshift(detail);
    return { order: cloneOrder(duplicatedOrder), detail: cloneDetail(detail) };
  }

  async approveOrder(orderId: OrderId): Promise<OrderCreateResult> {
    await delay(80);
    return this.transitionOrderStatus(orderId, "approved");
  }

  async cancelOrder(orderId: OrderId): Promise<OrderCreateResult> {
    await delay(80);
    return this.transitionOrderStatus(orderId, "cancelled");
  }

  async transitionOrderStatus(orderId: OrderId, nextStatus: Order["status"]): Promise<OrderCreateResult> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.order.id === orderId);
    if (recordIndex === -1) {
      throw new Error("Pedido no encontrado.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Pedido no encontrado.");
    }

    if (!canTransitionOrderStatus(currentRecord.order.status, nextStatus)) {
      throw new Error("La transición de estado no es válida.");
    }

    const updatedOrder: Order = {
      ...currentRecord.order,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      requiresApproval: nextStatus === "pendingApproval" ? true : currentRecord.order.requiresApproval,
    };
    const updatedDetail = buildDetail(updatedOrder, currentRecord, `El pedido cambió al estado ${getOrderStatusLabel(nextStatus).toLowerCase()}.`);
    this.records[recordIndex] = updatedDetail;
    return { order: cloneOrder(updatedOrder), detail: cloneDetail(updatedDetail) };
  }

  async syncOrderToTango(orderId: OrderId): Promise<OrderCreateResult> {
    await delay(120);
    const recordIndex = this.records.findIndex((item) => item.order.id === orderId);
    if (recordIndex === -1) {
      throw new Error("Pedido no encontrado.");
    }

    const currentRecord = this.records[recordIndex];
    if (currentRecord === undefined) {
      throw new Error("Pedido no encontrado.");
    }

    if (currentRecord.order.status === "cancelled") {
      throw new Error("El pedido cancelado no puede enviarse a Tango.");
    }

    if (currentRecord.order.status === "sentToTango" || currentRecord.order.status === "invoiced") {
      throw new Error("El pedido ya fue enviado a Tango.");
    }

    if (currentRecord.order.status !== "approved") {
      throw new Error("El pedido no está listo para enviarse a Tango.");
    }

    const updatedOrder: Order = {
      ...currentRecord.order,
      status: "sentToTango",
      updatedAt: new Date().toISOString(),
    };
    const updatedDetail = buildDetail(updatedOrder, currentRecord, "Se envió el pedido a Tango de forma simulada.");
    this.records[recordIndex] = updatedDetail;
    return { order: cloneOrder(updatedOrder), detail: cloneDetail(updatedDetail) };
  }

  getAuthorization(orderId: OrderId): Promise<OrderAuthorizationSummary | null> {
    const record = this.records.find((item) => item.order.id === orderId);
    return Promise.resolve(record === undefined ? null : { ...record.authorization, reasons: [...record.authorization.reasons] });
  }

  getTangoStatus(orderId: OrderId): Promise<OrderTangoStatus | null> {
    const record = this.records.find((item) => item.order.id === orderId);
    return Promise.resolve(record === undefined ? null : record.tango.status);
  }
}
