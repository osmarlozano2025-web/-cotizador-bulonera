import { BadgeDollarSign, Repeat2, ShieldCheck, ShoppingCart, TrendingUp, UsersRound } from "lucide-react";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import type { ClientId, SellerId } from "@/domain/shared";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import { MOCK_ORDER_RECORDS } from "@/features/orders/data/mock-orders";
import { getOrderStatusLabel } from "@/features/orders/utils/order-labels";
import { MOCK_QUOTES } from "@/features/quotes/data/mock-quotes";
import { buildReportContext } from "./mock-reports";
import type {
  CommercialClientRankingRow,
  CommercialEvolutionPoint,
  CommercialOperationRow,
  CommercialPeriodGranularity,
  CommercialReportModel,
  CommercialSellerRankingRow,
  CommercialSummaryCard,
  ReportFilters,
} from "../types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NUMBER_FORMATTER = new Intl.NumberFormat("es-AR");

type CommercialEventKind = "order" | "quote";

interface CommercialEvent {
  readonly kind: CommercialEventKind;
  readonly id: string;
  readonly date: string;
  readonly label: string;
  readonly clientId?: ClientId;
  readonly sellerId?: SellerId;
  readonly amount: number;
}

type CommercialClientRankingDraft = Omit<CommercialClientRankingRow, "position"> & { readonly to?: string };
type CommercialSellerRankingDraft = Omit<CommercialSellerRankingRow, "position">;

interface BucketAccumulator {
  readonly key: string;
  readonly label: string;
  readonly timestamp: number;
  ordersCount: number;
  total: number;
}

function formatCount(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfUtcWeek(value: Date): Date {
  const day = value.getUTCDay();
  const offset = (day + 6) % 7;
  const start = new Date(value);
  start.setUTCDate(start.getUTCDate() - offset);
  return startOfUtcDay(start);
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function formatShortDate(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function formatMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(value);
}

function buildPeriodLabel(filters: ReportFilters, dates: readonly string[]): string {
  if (filters.dateFrom.length > 0 && filters.dateTo.length > 0) {
    return `${formatCommercialDateTime(`${filters.dateFrom}T00:00:00.000Z`)} - ${formatCommercialDateTime(`${filters.dateTo}T23:59:59.999Z`)}`;
  }

  if (filters.dateFrom.length > 0) {
    return `Desde ${formatCommercialDateTime(`${filters.dateFrom}T00:00:00.000Z`)}`;
  }

  if (filters.dateTo.length > 0) {
    return `Hasta ${formatCommercialDateTime(`${filters.dateTo}T23:59:59.999Z`)}`;
  }

  if (dates.length === 0) {
    return "Sin período seleccionado";
  }

  const sortedDates = [...dates].sort((left, right) => toTimestamp(left) - toTimestamp(right));
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  if (first === undefined || last === undefined) {
    return "Sin período seleccionado";
  }

  return `${formatCommercialDateTime(first)} - ${formatCommercialDateTime(last)}`;
}

function determineGranularity(filters: ReportFilters, dates: readonly string[]): CommercialPeriodGranularity {
  const from = filters.dateFrom.length > 0 ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : undefined;
  const to = filters.dateTo.length > 0 ? new Date(`${filters.dateTo}T23:59:59.999Z`) : undefined;

  if (from !== undefined && to !== undefined) {
    const spanDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY_IN_MS) + 1);
    if (spanDays <= 31) {
      return "day";
    }

    if (spanDays <= 180) {
      return "week";
    }

    return "month";
  }

  if (dates.length === 0) {
    return "day";
  }

  const sortedDates = [...dates].sort((left, right) => toTimestamp(left) - toTimestamp(right));
  const first = new Date(sortedDates[0] ?? "");
  const last = new Date(sortedDates[sortedDates.length - 1] ?? "");
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
    return "day";
  }

  const spanDays = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / DAY_IN_MS) + 1);
  if (spanDays <= 31) {
    return "day";
  }

  if (spanDays <= 180) {
    return "week";
  }

  return "month";
}

function getBucketStart(date: Date, granularity: CommercialPeriodGranularity): Date {
  if (granularity === "week") {
    return startOfUtcWeek(date);
  }

  if (granularity === "month") {
    return startOfUtcMonth(date);
  }

  return startOfUtcDay(date);
}

function getBucketLabel(date: Date, granularity: CommercialPeriodGranularity): string {
  if (granularity === "week") {
    const start = startOfUtcWeek(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  if (granularity === "month") {
    return formatMonthLabel(date);
  }

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function createEventLabel(kind: CommercialEventKind, id: string): string {
  return kind === "order" ? `Pedido ${id}` : `Cotización ${id}`;
}

function buildCommercialEvents(filters: ReportFilters): readonly CommercialEvent[] {
  const context = buildReportContext(filters);
  const filteredOrderIds = new Set(context.orders.map((order) => order.id));
  const filteredQuoteIds = new Set(context.quotes.map((quote) => quote.id));

  const orders = MOCK_ORDER_RECORDS.filter((record) => filteredOrderIds.has(record.order.id)).map((record) => ({
    kind: "order" as const,
    id: record.order.id,
    date: record.order.updatedAt,
    label: record.order.number,
    clientId: record.order.clientId,
    amount: record.order.total,
    ...(record.order.sellerId !== undefined ? { sellerId: record.order.sellerId } : {}),
  }));

  const quotes = MOCK_QUOTES.filter((quote) => filteredQuoteIds.has(quote.id)).map((quote) => ({
    kind: "quote" as const,
    id: quote.id,
    date: quote.updatedAt,
    label: quote.number,
    clientId: quote.clientId,
    amount: quote.total,
    ...(quote.sellerId !== undefined ? { sellerId: quote.sellerId } : {}),
  }));

  return [...orders, ...quotes].sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date));
}

function buildEvolution(events: readonly CommercialEvent[], granularity: CommercialPeriodGranularity): readonly CommercialEvolutionPoint[] {
  const buckets = new Map<string, BucketAccumulator>();

  for (const event of events.filter((item) => item.kind === "order")) {
    const timestamp = toTimestamp(event.date);
    const date = new Date(timestamp);
    const bucketStart = getBucketStart(date, granularity);
    const key = bucketStart.toISOString();
    const label = getBucketLabel(bucketStart, granularity);
    const existing = buckets.get(key);

    if (existing === undefined) {
      buckets.set(key, {
        key,
        label,
        timestamp: bucketStart.getTime(),
        ordersCount: 1,
        total: event.amount,
      });
      continue;
    }

    existing.ordersCount += 1;
    existing.total += event.amount;
  }

  const orderedBuckets = [...buckets.values()].sort((left, right) => left.timestamp - right.timestamp);
  const maxTotal = Math.max(...orderedBuckets.map((bucket) => bucket.total), 0);

  return orderedBuckets.map((bucket) => ({
    label: bucket.label,
    ordersCount: bucket.ordersCount,
    total: bucket.total,
    totalLabel: formatCurrency(bucket.total),
    ratio: maxTotal <= 0 ? 0 : Math.round((bucket.total / maxTotal) * 100),
  }));
}

function buildClientRanking(events: readonly CommercialEvent[]): readonly CommercialClientRankingRow[] {
  const ordersByClient = new Map<ClientId, CommercialEvent[]>();
  const allByClient = new Map<ClientId, CommercialEvent[]>();

  for (const event of events) {
    if (event.clientId === undefined) {
      continue;
    }

    const existing = allByClient.get(event.clientId) ?? [];
    existing.push(event);
    allByClient.set(event.clientId, existing);

    if (event.kind === "order") {
      const orderEvents = ordersByClient.get(event.clientId) ?? [];
      orderEvents.push(event);
      ordersByClient.set(event.clientId, orderEvents);
    }
  }

  return [...ordersByClient.entries()]
    .map(([clientId, clientEvents]) => {
      const customerEvents = allByClient.get(clientId) ?? [];
      const orderTotal = clientEvents.reduce((total, event) => total + event.amount, 0);
      const lastOperation = customerEvents.sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date))[0];
      const client = MOCK_CLIENTS.find((candidate) => candidate.id === clientId);

      return {
        clientId,
        clientName: client?.tradeName ?? client?.legalName ?? "Cliente sin nombre",
        ordersCount: clientEvents.length,
        total: orderTotal,
        totalLabel: formatCurrency(orderTotal),
        averageTicket: clientEvents.length > 0 ? orderTotal / clientEvents.length : 0,
        averageTicketLabel: formatCurrency(clientEvents.length > 0 ? orderTotal / clientEvents.length : 0),
        lastOperationLabel: lastOperation === undefined ? "Sin operaciones" : createEventLabel(lastOperation.kind, lastOperation.label),
        lastOperationDate: lastOperation === undefined ? "Sin fecha" : formatCommercialDateTime(lastOperation.date),
      } satisfies CommercialClientRankingDraft;
    })
    .sort((left, right) => right.total - left.total)
    .slice(0, 5)
    .map((row, index) => ({
      ...row,
      position: index + 1,
      to: `/clients/${row.clientId}`,
    }));
}

function buildSellerRanking(events: readonly CommercialEvent[]): readonly CommercialSellerRankingRow[] {
  const ordersBySeller = new Map<SellerId, CommercialEvent[]>();
  const quotesBySeller = new Map<SellerId, CommercialEvent[]>();

  for (const event of events) {
    if (event.sellerId === undefined) {
      continue;
    }

    if (event.kind === "order") {
      const sellerOrders = ordersBySeller.get(event.sellerId) ?? [];
      sellerOrders.push(event);
      ordersBySeller.set(event.sellerId, sellerOrders);
      continue;
    }

    const sellerQuotes = quotesBySeller.get(event.sellerId) ?? [];
    sellerQuotes.push(event);
    quotesBySeller.set(event.sellerId, sellerQuotes);
  }

  const rankedRows: CommercialSellerRankingDraft[] = [];

  for (const seller of MOCK_SELLERS) {
    const sellerOrders = ordersBySeller.get(seller.id) ?? [];
    const sellerQuotes = quotesBySeller.get(seller.id) ?? [];
    if (sellerOrders.length === 0 && sellerQuotes.length === 0) {
      continue;
    }

    const approvedQuotesCount = sellerQuotes.filter((event) => {
      const quote = MOCK_QUOTES.find((candidate) => candidate.id === event.id);
      return quote?.status === "accepted";
    }).length;
    const quoteTotal = sellerQuotes.length;
    const sellerTotal = sellerOrders.reduce((total, event) => total + event.amount, 0);
    const conversionRate = quoteTotal > 0 ? Math.round((approvedQuotesCount / quoteTotal) * 100) : 0;

    rankedRows.push({
      sellerId: seller.id,
      sellerName: seller.label,
      ordersCount: sellerOrders.length,
      approvedQuotesCount,
      total: sellerTotal,
      totalLabel: formatCurrency(sellerTotal),
      conversionRate,
      conversionRateLabel: `${conversionRate}%`,
    });
  }

  return rankedRows
    .sort((left, right) => right.total - left.total)
    .slice(0, 5)
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }));
}

function buildOperations(filters: ReportFilters): readonly CommercialOperationRow[] {
  const context = buildReportContext(filters);
  const filteredOrderIds = new Set(context.orders.map((order) => order.id));
  const orderRecordsById = new Map(MOCK_ORDER_RECORDS.map((record) => [record.order.id, record] as const));

  return MOCK_ORDER_RECORDS
    .filter((record) => filteredOrderIds.has(record.order.id))
    .sort((left, right) => toTimestamp(right.order.updatedAt) - toTimestamp(left.order.updatedAt))
    .map((record) => {
      const quote = record.order.sourceQuoteId === undefined ? undefined : MOCK_QUOTES.find((candidate) => candidate.id === record.order.sourceQuoteId);
      const client = MOCK_CLIENTS.find((candidate) => candidate.id === record.order.clientId);
      const seller = MOCK_SELLERS.find((candidate) => candidate.id === record.order.sellerId);
      const orderRecord = orderRecordsById.get(record.order.id);

      return {
        id: record.order.id,
        date: record.order.updatedAt,
        orderNumber: record.order.number,
        clientName: orderRecord?.detail.clientName ?? client?.tradeName ?? client?.legalName ?? "Cliente sin nombre",
        sellerName: orderRecord?.detail.sellerName ?? seller?.label ?? "Sin vendedor",
        statusLabel: getOrderStatusLabel(record.order.status),
        total: record.order.total,
        totalLabel: formatCurrency(record.order.total),
        originLabel: quote === undefined ? "Pedido" : "Cotización convertida",
        orderTo: `/orders/${record.order.id}`,
        clientTo: `/clients/${record.order.clientId}`,
        ...(quote !== undefined ? { quoteTo: `/quotes/${quote.id}` } : {}),
      };
    });
}

function buildSummaryCards(filters: ReportFilters, events: readonly CommercialEvent[]): readonly CommercialSummaryCard[] {
  const salesEvents = events.filter((event) => event.kind === "order" && (event.label.length > 0));
  const salesOrders = salesEvents.filter((event) => {
    const orderRecord = MOCK_ORDER_RECORDS.find((candidate) => candidate.order.id === event.id);
    return orderRecord?.order.status === "dispatched" || orderRecord?.order.status === "delivered";
  });
  const salesTotal = salesOrders.reduce((total, event) => total + event.amount, 0);
  const approvedQuotes = events.filter((event) => event.kind === "quote" && MOCK_QUOTES.find((candidate) => candidate.id === event.id)?.status === "accepted");
  const convertedOrders = events.filter((event) => event.kind === "order" && MOCK_ORDER_RECORDS.find((candidate) => candidate.order.id === event.id)?.order.sourceQuoteId !== undefined);
  const averageTicket = salesOrders.length > 0 ? salesTotal / salesOrders.length : 0;

  const clientTotals = new Map<string, number>();
  for (const event of salesOrders) {
    if (event.clientId === undefined) {
      continue;
    }

    clientTotals.set(event.clientId, (clientTotals.get(event.clientId) ?? 0) + event.amount);
  }

  const topClientEntry = [...clientTotals.entries()].sort((left, right) => right[1] - left[1])[0];
  const topClient = topClientEntry === undefined ? undefined : MOCK_CLIENTS.find((client) => client.id === topClientEntry[0]);
  const topClientTotal = topClientEntry?.[1] ?? 0;
  const conversionRate = approvedQuotes.length > 0 ? Math.round((convertedOrders.length / approvedQuotes.length) * 100) : 0;
  const periodDates = events.map((event) => event.date);

  return [
    {
      title: "Ventas del período",
      value: formatCurrency(salesTotal),
      description: "Facturación confirmada del período filtrado.",
      icon: TrendingUp,
      tone: "success",
      note: buildPeriodLabel(filters, periodDates),
    },
    {
      title: "Pedidos generados",
      value: formatCount(events.filter((event) => event.kind === "order").length),
      description: "Pedidos comerciales dentro del filtro activo.",
      icon: ShoppingCart,
      tone: "primary",
      note: "Actividad comercial registrada",
    },
    {
      title: "Cotizaciones aprobadas",
      value: formatCount(approvedQuotes.length),
      description: "Cotizaciones aceptadas por el cliente.",
      icon: ShieldCheck,
      tone: "warning",
      note: "Base para la conversión comercial",
    },
    {
      title: "Tasa de conversión",
      value: `${conversionRate}%`,
      description: "Pedidos convertidos sobre cotizaciones aprobadas.",
      icon: Repeat2,
      tone: "primary",
      note: `${formatCount(convertedOrders.length)} pedidos convertidos`,
    },
    {
      title: "Ticket promedio",
      value: formatCurrency(averageTicket),
      description: "Promedio de venta por pedido con facturación.",
      icon: BadgeDollarSign,
      tone: "muted",
      note: salesOrders.length > 0 ? `${formatCount(salesOrders.length)} pedidos facturados` : "Sin pedidos facturados",
    },
    {
      title: "Cliente con mayor facturación",
      value: topClient?.tradeName ?? topClient?.legalName ?? "Sin datos",
      description: topClient === undefined ? "No hay facturación para mostrar." : "Cliente con mayor volumen facturado.",
      icon: UsersRound,
      tone: "success",
      note: topClient !== undefined ? formatCurrency(topClientTotal) : "Sin ventas registradas",
    },
  ];
}

export function buildCommercialReportModel(filters: ReportFilters): CommercialReportModel {
  const events = buildCommercialEvents(filters);
  const granularity = determineGranularity(filters, events.map((event) => event.date));
  const summaryCards = buildSummaryCards(filters, events);
  const evolution = buildEvolution(events, granularity);
  const clientRanking = buildClientRanking(events);
  const sellerRanking = buildSellerRanking(events);
  const operations = buildOperations(filters);

  return {
    periodLabel: buildPeriodLabel(filters, events.map((event) => event.date)),
    granularity,
    summaryCards,
    evolution,
    clientRanking,
    sellerRanking,
    operations,
  };
}
