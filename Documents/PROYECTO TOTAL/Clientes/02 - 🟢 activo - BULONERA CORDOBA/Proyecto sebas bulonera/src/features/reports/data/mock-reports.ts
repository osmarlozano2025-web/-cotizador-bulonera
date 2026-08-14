import { Clock3, Package, PackageCheck, ShieldCheck, ShoppingCart, TrendingUp, Truck, UsersRound } from "lucide-react";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import { MOCK_PRODUCT_RECORDS } from "@/features/products/data/mock-products";
import { getProductStockLabel } from "@/features/products/utils/product-labels";
import { getProductStockState } from "@/features/products/utils/product-calculations";
import { MOCK_QUOTES } from "@/features/quotes/data/mock-quotes";
import { getQuoteStatusLabel } from "@/features/quotes/utils/quote-labels";
import { MOCK_ORDER_RECORDS } from "@/features/orders/data/mock-orders";
import { getOrderStatusLabel } from "@/features/orders/utils/order-labels";
import { getDispatchGuideList, getDispatchReferenceData } from "@/features/logistics/data/mock-logistics";
import type { ReportCategory, ReportCategoryView, ReportEntity, ReportFilters, ReportMetricCard, ReportReferenceData, ReportSummaryBlock, ReportSummaryItem, ReportsModel, ReportStatusFilter } from "../types";

const NUMBER_FORMATTER = new Intl.NumberFormat("es-AR");

const STATUS_OPTIONS: ReportReferenceData["statusOptions"] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendiente" },
  { id: "active", label: "Activo" },
  { id: "ready", label: "Listo" },
  { id: "dispatched", label: "Despachado" },
  { id: "delivered", label: "Entregado" },
  { id: "failed", label: "Fallido" },
  { id: "cancelled", label: "Cancelado" },
] as const;

interface ReportBarItem extends ReportSummaryItem {
  readonly ratio: number;
}

export interface ReportContext {
  readonly orders: readonly ReportEntity[];
  readonly quotes: readonly ReportEntity[];
  readonly guides: readonly ReportEntity[];
  readonly clients: readonly ReportEntity[];
  readonly products: readonly ReportEntity[];
  readonly vehicleLabels: Readonly<Record<string, string>>;
  readonly driverLabels: Readonly<Record<string, string>>;
}

function formatCount(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function formatAverageDelivery(minutes: number | null): string {
  if (minutes === null) {
    return "—";
  }

  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  return hours > 0 ? `${hours} h ${remainingMinutes.toString().padStart(2, "0")} min` : `${remainingMinutes} min`;
}

function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

function dateFromInput(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function dateToInput(value: string): number {
  return new Date(`${value}T23:59:59.999Z`).getTime();
}

function withinDateRange(date: string, filters: ReportFilters): boolean {
  const timestamp = toTimestamp(date);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (filters.dateFrom.length > 0 && timestamp < dateFromInput(filters.dateFrom)) {
    return false;
  }

  if (filters.dateTo.length > 0 && timestamp > dateToInput(filters.dateTo)) {
    return false;
  }

  return true;
}

function matchesFilters(entity: ReportEntity, filters: ReportFilters): boolean {
  if (!withinDateRange(entity.date, filters)) {
    return false;
  }

  if (filters.clientId !== "all" && entity.clientId !== filters.clientId) {
    return false;
  }

  if (filters.sellerId !== "all" && entity.sellerId !== filters.sellerId) {
    return false;
  }

  if (filters.productId !== "all" && (entity.productIds === undefined || !entity.productIds.some((productId) => productId === filters.productId))) {
    return false;
  }

  if (filters.zoneId !== "all" && entity.zoneId !== filters.zoneId) {
    return false;
  }

  if (filters.driverId !== "all" && entity.driverId !== filters.driverId) {
    return false;
  }

  if (filters.status !== "all" && entity.status !== filters.status) {
    return false;
  }

  return true;
}

function mapOrderStatus(status: string): ReportStatusFilter {
  if (status === "draft" || status === "pendingApproval") {
    return "pending";
  }

  if (status === "approved" || status === "preparing") {
    return "active";
  }

  if (status === "prepared" || status === "readyForDispatch") {
    return "ready";
  }

  if (status === "dispatched") {
    return "dispatched";
  }

  if (status === "delivered" || status === "sentToTango" || status === "invoiced") {
    return "delivered";
  }

  return "cancelled";
}

function mapQuoteStatus(status: string): ReportStatusFilter {
  if (status === "draft" || status === "pendingApproval" || status === "sent") {
    return "pending";
  }

  if (status === "accepted") {
    return "active";
  }

  if (status === "converted") {
    return "delivered";
  }

  return "cancelled";
}

function mapGuideStatus(status: string): ReportStatusFilter {
  if (status === "pending" || status === "assigned" || status === "rescheduled") {
    return "pending";
  }

  if (status === "preparing") {
    return "active";
  }

  if (status === "ready") {
    return "ready";
  }

  if (status === "dispatched") {
    return "dispatched";
  }

  if (status === "delivered") {
    return "delivered";
  }

  if (status === "failed") {
    return "failed";
  }

  return "cancelled";
}

function mapClientStatus(status: string): ReportStatusFilter {
  if (status === "active") {
    return "active";
  }

  if (status === "pendingApproval") {
    return "pending";
  }

  return "cancelled";
}

function mapProductStatus(status: string): ReportStatusFilter {
  if (status === "active") {
    return "active";
  }

  if (status === "inactive") {
    return "pending";
  }

  return "cancelled";
}

function buildContext(): ReportContext {
  const dispatchGuides = getDispatchGuideList();
  const guidesByOrderId = new Map(dispatchGuides.map((guide) => [guide.orderId, guide]));
  const dispatchReferenceData = getDispatchReferenceData();
  const vehicleLabels = Object.fromEntries(dispatchReferenceData.vehicleOptions.map((option) => [option.id, option.label]));
  const driverLabels = Object.fromEntries(dispatchReferenceData.driverOptions.map((option) => [option.id, option.label]));

  const orders = MOCK_ORDER_RECORDS.map((record) => {
    const guide = guidesByOrderId.get(record.order.id);
    return {
      kind: "order",
      id: record.order.id,
      label: record.order.number,
      secondaryLabel: record.detail.clientName,
      date: record.order.updatedAt,
      status: mapOrderStatus(record.order.status),
      clientId: record.order.clientId,
      productIds: record.order.items.map((item) => item.productId),
      amount: record.order.total,
      ...(record.order.sellerId !== undefined ? { sellerId: record.order.sellerId } : {}),
      ...(guide?.zoneId !== undefined ? { zoneId: guide.zoneId } : {}),
      ...(guide?.driverId !== undefined ? { driverId: guide.driverId } : {}),
      ...(guide?.vehicleId !== undefined ? { vehicleId: guide.vehicleId } : {}),
    } satisfies ReportEntity;
  });

  const quotes = MOCK_QUOTES.map((quote) => ({
    kind: "quote",
    id: quote.id,
    label: quote.number,
    secondaryLabel: MOCK_CLIENTS.find((client) => client.id === quote.clientId)?.tradeName ?? "Cliente",
    date: quote.updatedAt,
    status: mapQuoteStatus(quote.status),
    clientId: quote.clientId,
    productIds: quote.items.map((item) => item.productId),
    amount: quote.total,
    ...(quote.sellerId !== undefined ? { sellerId: quote.sellerId } : {}),
  }) satisfies ReportEntity);

  const guides = dispatchGuides.map((guide) => {
    const order = MOCK_ORDER_RECORDS.find((record) => record.order.id === guide.orderId);
    return {
      kind: "guide",
      id: guide.id,
      label: guide.number,
      secondaryLabel: guide.driverName ?? "Sin repartidor",
      date: guide.updatedAt,
      status: mapGuideStatus(guide.status),
      clientId: guide.clientId,
      productIds: guide.items.map((item) => item.productId),
      ...(guide.deliveredAt !== undefined ? { deliveryTimeMinutes: Math.max(0, Math.round((toTimestamp(guide.deliveredAt) - toTimestamp(guide.createdAt)) / 60000)) } : {}),
      ...(order?.order.sellerId !== undefined ? { sellerId: order.order.sellerId } : {}),
      ...(guide.zoneId !== undefined ? { zoneId: guide.zoneId } : {}),
      ...(guide.driverId !== undefined ? { driverId: guide.driverId } : {}),
      ...(guide.vehicleId !== undefined ? { vehicleId: guide.vehicleId } : {}),
    } satisfies ReportEntity;
  });

  const clients = MOCK_CLIENTS.map((client) => {
    const assignedSeller = MOCK_SELLERS.find((seller) => seller.id === client.assignedSellerId);
    return {
      kind: "client",
      id: client.id,
      label: client.tradeName ?? client.legalName,
      date: client.updatedAt,
      status: mapClientStatus(client.status),
      clientId: client.id,
      ...(assignedSeller !== undefined ? { secondaryLabel: assignedSeller.label } : {}),
      ...(client.assignedSellerId !== undefined ? { sellerId: client.assignedSellerId } : {}),
    } satisfies ReportEntity;
  });

  const products = MOCK_PRODUCT_RECORDS.map((record) => {
    const stockState = getProductStockState(record.product);
    return {
      kind: "product",
      id: record.product.id,
      label: record.product.name,
      secondaryLabel: record.product.internalCode,
      date: record.product.updatedAt,
      status: mapProductStatus(record.product.status),
      productIds: [record.product.id],
      stockState,
    } satisfies ReportEntity;
  });

  return { orders, quotes, guides, clients, products, vehicleLabels, driverLabels };
}

export function buildReportContext(filters: ReportFilters): ReportContext {
  const context = buildContext();
  return {
    ...context,
    orders: context.orders.filter((entity) => matchesFilters(entity, filters)),
    quotes: context.quotes.filter((entity) => matchesFilters(entity, filters)),
    guides: context.guides.filter((entity) => matchesFilters(entity, filters)),
    clients: context.clients.filter((entity) => matchesFilters(entity, filters)),
    products: context.products.filter((entity) => matchesFilters(entity, filters)),
  };
}

function groupCounts<T>(items: readonly T[], getLabel: (item: T) => string): readonly { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]).map(([label, value]) => ({ label, value }));
}

function groupTotals<T>(items: readonly T[], getLabel: (item: T) => string, getAmount: (item: T) => number): readonly { label: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item);
    totals.set(label, (totals.get(label) ?? 0) + getAmount(item));
  }

  return [...totals.entries()].sort((left, right) => right[1] - left[1]).map(([label, value]) => ({ label, value }));
}

function toRankedItems(items: readonly { label: string; value: number }[]): readonly ReportBarItem[] {
  const max = Math.max(...items.map((item) => item.value), 0);
  return items.map((item) => ({
    label: item.label,
    value: formatCount(item.value),
    ratio: max <= 0 ? 0 : Math.round((item.value / max) * 100),
  }));
}

function toSimpleItems(items: readonly { label: string; value: string; detail?: string }[]): readonly ReportSummaryItem[] {
  return items;
}

function buildMetricCards(context: ReportContext): readonly ReportMetricCard[] {
  const orders = context.orders;
  const quotes = context.quotes;
  const guides = context.guides;
  const clients = context.clients;
  const products = context.products;

  const salesTotal = orders.filter((order) => order.status === "dispatched" || order.status === "delivered").reduce((total, order) => total + (order.amount ?? 0), 0);
  const deliveredGuides = guides.filter((guide) => guide.status === "delivered");
  const averageDeliveryMinutes = deliveredGuides.length === 0
    ? null
    : deliveredGuides.reduce((total, guide) => total + (guide.deliveryTimeMinutes ?? 0), 0) / deliveredGuides.length;

  return [
    {
      title: "Ventas del período",
      value: formatCurrency(salesTotal),
      description: "Pedidos facturables dentro del corte.",
      icon: TrendingUp,
      tone: "success",
      note: `${formatCount(orders.filter((order) => order.status === "dispatched" || order.status === "delivered").length)} pedidos cerrados o en reparto`,
    },
    {
      title: "Pedidos creados",
      value: formatCount(orders.length),
      description: "Pedidos comerciales con actividad.",
      icon: ShoppingCart,
      tone: "primary",
    },
    {
      title: "Pedidos entregados",
      value: formatCount(orders.filter((order) => order.status === "delivered").length),
      description: "Pedidos que completaron la entrega.",
      icon: PackageCheck,
      tone: "success",
    },
    {
      title: "Entregas fallidas",
      value: formatCount(guides.filter((guide) => guide.status === "failed").length),
      description: "Guías marcadas con incidencia.",
      icon: Truck,
      tone: "danger",
    },
    {
      title: "Cotizaciones aprobadas",
      value: formatCount(quotes.filter((quote) => quote.status === "active").length),
      description: "Cotizaciones aceptadas en el corte.",
      icon: ShieldCheck,
      tone: "warning",
    },
    {
      title: "Clientes activos",
      value: formatCount(clients.filter((client) => client.status === "active").length),
      description: "Clientes habilitados comercialmente.",
      icon: UsersRound,
      tone: "primary",
    },
    {
      title: "Productos con bajo stock",
      value: formatCount(products.filter((product) => product.stockState === "low" || product.stockState === "empty").length),
      description: "Productos que necesitan reposición.",
      icon: Package,
      tone: "warning",
    },
    {
      title: "Tiempo promedio de entrega",
      value: formatAverageDelivery(averageDeliveryMinutes),
      description: "Promedio de guías entregadas.",
      icon: Clock3,
      tone: "muted",
      note: deliveredGuides.length > 0 ? `${formatCount(deliveredGuides.length)} entregas analizadas` : "Sin entregas confirmadas",
    },
  ];
}

function buildCommercialBlocks(context: ReportContext): readonly ReportSummaryBlock[] {
  const salesOrders = context.orders.filter((order) => order.status === "dispatched" || order.status === "delivered");
  return [
    {
      title: "Resumen comercial",
      description: "Lectura inmediata del movimiento comercial.",
      items: toSimpleItems([
        { label: "Ventas por período", value: formatCurrency(salesOrders.reduce((total, order) => total + (order.amount ?? 0), 0)), detail: "Pedidos facturables" },
        { label: "Cotizaciones aprobadas", value: formatCount(context.quotes.filter((quote) => quote.status === "active").length), detail: "Aceptadas en el corte" },
        { label: "Pedidos generados", value: formatCount(context.orders.length), detail: "Pedidos con actividad" },
      ]),
      emptyMessage: "No se detectó actividad comercial en el período filtrado.",
    },
    {
      title: "Ventas por cliente",
      description: "Clientes con mayor volumen de compra.",
      items: toRankedItems(groupTotals(context.orders, (order) => order.secondaryLabel ?? order.label, (order) => order.amount ?? 0).slice(0, 5)),
      emptyMessage: "No hay ventas para mostrar con los filtros actuales.",
    },
    {
      title: "Cotizaciones por estado",
      description: "Distribución del ciclo comercial de cotizaciones.",
      items: toRankedItems(groupCounts(context.quotes, (quote) => getQuoteStatusLabel(MOCK_QUOTES.find((candidate) => candidate.id === quote.id)?.status ?? "draft")).map((item) => ({ label: item.label, value: item.value }))),
      emptyMessage: "No hay cotizaciones en el período filtrado.",
    },
  ];
}

function buildProductBlocks(context: ReportContext): readonly ReportSummaryBlock[] {
  const productSales = new Map<string, number>();
  for (const order of context.orders) {
    const original = MOCK_ORDER_RECORDS.find((record) => record.order.id === order.id);
    if (original === undefined) {
      continue;
    }

    for (const item of original.order.items) {
      productSales.set(item.productId, (productSales.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const stockCriticalItems = context.products
    .filter((product) => product.stockState === "low" || product.stockState === "empty")
    .slice(0, 5)
    .map((product) => {
      const record = MOCK_PRODUCT_RECORDS.find((candidate) => candidate.product.id === product.id);
      const stockLabel = record === undefined ? getProductStockLabel("low") : getProductStockLabel(record.stockState);
      return {
        label: product.label,
        value: stockLabel,
        detail: product.secondaryLabel ?? "",
      };
    });

  const mostSoldItems = [...productSales.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([productId, value]) => ({
      label: MOCK_PRODUCT_RECORDS.find((candidate) => candidate.product.id === productId)?.product.name ?? productId,
      value,
    }));

  const noMovementItems = context.products
    .filter((product) => !productSales.has(product.id))
    .slice(0, 5)
    .map((product) => ({ label: product.label, value: "Sin movimiento", detail: product.secondaryLabel ?? "" }));

  return [
    {
      title: "Stock crítico",
      description: "Productos con niveles bajos o sin stock.",
      items: stockCriticalItems,
      emptyMessage: "No hay productos con stock crítico en el corte actual.",
    },
    {
      title: "Productos más vendidos",
      description: "Ítems con mayor rotación en pedidos.",
      items: toRankedItems(mostSoldItems),
      emptyMessage: "Todavía no hay ventas asociadas a productos.",
    },
    {
      title: "Productos sin movimiento",
      description: "Catálogo sin uso en el período filtrado.",
      items: noMovementItems,
      emptyMessage: "Todos los productos tuvieron algún movimiento en el período filtrado.",
    },
  ];
}

function buildOperationBlocks(context: ReportContext): readonly ReportSummaryBlock[] {
  const ordersByStatus = groupCounts(context.orders, (order) => getOrderStatusLabel(MOCK_ORDER_RECORDS.find((candidate) => candidate.order.id === order.id)?.order.status ?? "draft"));
  const deliveredGuides = context.guides.filter((guide) => guide.status === "delivered");
  const failedGuides = context.guides.filter((guide) => guide.status === "failed");

  return [
    {
      title: "Pedidos por estado",
      description: "Lectura operativa del circuito de pedidos.",
      items: toRankedItems(ordersByStatus),
      emptyMessage: "No hay pedidos para mostrar con los filtros actuales.",
    },
    {
      title: "Entregas realizadas",
      description: "Guías completadas con éxito.",
      items: toSimpleItems(deliveredGuides.slice(0, 5).map((guide) => ({
        label: guide.label,
        value: guide.secondaryLabel ?? "Sin repartidor",
        detail: guide.deliveryTimeMinutes !== undefined ? `${formatAverageDelivery(guide.deliveryTimeMinutes)} de viaje` : "Sin tiempo registrado",
      }))),
      emptyMessage: "No se registraron entregas completadas en el período.",
    },
    {
      title: "Entregas fallidas",
      description: "Guías con incidencias de reparto.",
      items: toSimpleItems(failedGuides.slice(0, 5).map((guide) => ({
        label: guide.label,
        value: guide.secondaryLabel ?? "Sin repartidor",
        detail: guide.vehicleId !== undefined ? context.vehicleLabels[guide.vehicleId] ?? "Vehículo sin dato" : "Sin vehículo asignado",
      }))),
      emptyMessage: "No hay entregas fallidas para el corte seleccionado.",
    },
  ];
}

function buildClientBlocks(context: ReportContext): readonly ReportSummaryBlock[] {
  const activeClients = context.clients.filter((client) => client.status === "active");
  const recentClients = [...context.clients].sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date)).slice(0, 5);
  const topClients = groupTotals(context.orders, (order) => order.secondaryLabel ?? order.label, (order) => order.amount ?? 0).slice(0, 5);

  return [
    {
      title: "Clientes activos",
      description: "Carpeta comercial habilitada.",
      items: toSimpleItems(activeClients.slice(0, 5).map((client) => ({
        label: client.label,
        value: client.secondaryLabel ?? "Sin vendedor",
        detail: "Activo",
      }))),
      emptyMessage: "No hay clientes activos en el corte seleccionado.",
    },
    {
      title: "Clientes recientes",
      description: "Altas o actualizaciones más cercanas al período.",
      items: toSimpleItems(recentClients.map((client) => ({
        label: client.label,
        value: client.secondaryLabel ?? "Sin vendedor",
        detail: formatCommercialDateTime(client.date),
      }))),
      emptyMessage: "No se registraron clientes recientes en el período.",
    },
    {
      title: "Clientes con mayor compra",
      description: "Mayor volumen acumulado de pedidos.",
      items: toRankedItems(topClients),
      emptyMessage: "No hay compras para mostrar con los filtros actuales.",
    },
  ];
}

function buildProductivityBlocks(context: ReportContext): readonly ReportSummaryBlock[] {
  return [
    {
      title: "Entregas por repartidor",
      description: "Carga operativa del reparto.",
      items: toRankedItems(groupCounts(context.guides, (guide) => (guide.driverId !== undefined ? context.driverLabels[guide.driverId] ?? guide.secondaryLabel ?? "Sin repartidor" : "Sin repartidor"))),
      emptyMessage: "No hay repartidores con actividad para el período.",
    },
    {
      title: "Pedidos por vendedor",
      description: "Participación comercial por vendedor.",
      items: toRankedItems(groupCounts(context.orders, (order) => MOCK_SELLERS.find((seller) => seller.id === order.sellerId)?.label ?? "Sin asignar")),
      emptyMessage: "No hay pedidos vinculados a vendedores en el período.",
    },
    {
      title: "Uso de vehículos",
      description: "Distribución de guías por vehículo.",
      items: toRankedItems(groupCounts(context.guides, (guide) => (guide.vehicleId !== undefined ? context.vehicleLabels[guide.vehicleId] ?? "Sin vehículo" : "Sin vehículo"))),
      emptyMessage: "No hay vehículos con actividad en el período filtrado.",
    },
  ];
}

function buildCategoryViews(context: ReportContext): Readonly<Record<ReportCategory, ReportCategoryView>> {
  return {
    commercial: {
      title: "Comercial",
      description: "Ventas, cotizaciones y pedidos.",
      blocks: buildCommercialBlocks(context),
    },
    products: {
      title: "Productos",
      description: "Rotación, stock y catálogo.",
      blocks: buildProductBlocks(context),
    },
    operations: {
      title: "Operación",
      description: "Pedidos, logística y entregas.",
      blocks: buildOperationBlocks(context),
    },
    clients: {
      title: "Clientes",
      description: "Actividad y comportamiento de cartera.",
      blocks: buildClientBlocks(context),
    },
    productivity: {
      title: "Productividad",
      description: "Carga por recurso y rendimiento operativo.",
      blocks: buildProductivityBlocks(context),
    },
  } satisfies Readonly<Record<ReportCategory, ReportCategoryView>>;
}

export function getReportReferenceData(): ReportReferenceData {
  const dispatchReferenceData = getDispatchReferenceData();
  return {
    clientOptions: MOCK_CLIENTS.map((client) => ({ id: client.id, label: client.tradeName ?? client.legalName })),
    sellerOptions: MOCK_SELLERS.map((seller) => ({ id: seller.id, label: seller.label })),
    productOptions: MOCK_PRODUCT_RECORDS.map((record) => ({ id: record.product.id, label: record.product.name })),
    zoneOptions: dispatchReferenceData.zoneOptions,
    driverOptions: dispatchReferenceData.driverOptions,
    statusOptions: STATUS_OPTIONS,
  };
}

export function buildReportsModel(filters: ReportFilters): ReportsModel {
  const context = buildReportContext(filters);
  return {
    metrics: buildMetricCards(context),
    categories: buildCategoryViews(context),
  };
}
