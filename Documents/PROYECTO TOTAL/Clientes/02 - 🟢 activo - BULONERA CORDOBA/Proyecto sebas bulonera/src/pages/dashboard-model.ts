import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, Clock3, FileText, Package, PackageCheck, ShoppingCart, ShieldCheck, Truck, UsersRound, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { MOCK_APPROVAL_RECORDS } from "@/features/approvals/data/mock-approvals";
import { getApprovalStatusLabel } from "@/features/approvals/utils/approval-labels";
import { MOCK_CLIENTS } from "@/features/clients/data/mock-clients";
import { getDispatchGuideList, getLogisticsOrderList, getLogisticsSummary } from "@/features/logistics/data/mock-logistics";
import { MOCK_ORDER_RECORDS } from "@/features/orders/data/mock-orders";
import { MOCK_PRODUCT_RECORDS } from "@/features/products/data/mock-products";
import { MOCK_QUOTES } from "@/features/quotes/data/mock-quotes";
import { getQuoteStatusLabel } from "@/features/quotes/utils/quote-labels";

export type DashboardTone = "primary" | "success" | "warning" | "danger" | "muted";
export type DashboardTrendDirection = "up" | "down" | "flat";

export interface DashboardMetric {
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly trendLabel?: string;
  readonly trendDirection?: DashboardTrendDirection;
  readonly icon: LucideIcon;
  readonly tone: DashboardTone;
  readonly to?: string;
}

export interface DashboardActivityItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly icon: LucideIcon;
  readonly tone: DashboardTone;
  readonly to?: string;
}

export interface DashboardStatusItem {
  readonly label: string;
  readonly value: number;
}

export interface DashboardStatusGroup {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tone: DashboardTone;
  readonly items: readonly DashboardStatusItem[];
  readonly to?: string;
}

export interface DashboardAlertItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tone: DashboardTone;
  readonly to?: string;
}

export interface DashboardQuickLink {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly icon: LucideIcon;
}

export interface DashboardModel {
  readonly metrics: readonly DashboardMetric[];
  readonly activity: readonly DashboardActivityItem[];
  readonly operationalStatus: readonly DashboardStatusGroup[];
  readonly alerts: readonly DashboardAlertItem[];
  readonly quickLinks: readonly DashboardQuickLink[];
}

const COUNT_FORMATTER = new Intl.NumberFormat("es-AR");

const TONE_CLASS_NAMES: Record<DashboardTone, string> = {
  primary: "bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-800",
  success: "bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
  warning: "bg-amber-100 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
  danger: "bg-rose-100 text-rose-700 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900",
  muted: "bg-muted text-muted-foreground ring-border",
};

const ALERT_TONE_CLASS_NAMES: Record<DashboardTone, string> = {
  primary: "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30",
  success: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
  warning: "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
  danger: "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30",
  muted: "border-border bg-muted/30",
};

const DASHBOARD_FINANCIAL_STATUSES = new Set(["dispatched", "delivered", "sentToTango", "invoiced"]);
const DASHBOARD_PENDING_ORDER_STATUSES = new Set(["draft", "pendingApproval"]);
const DASHBOARD_PROCESSING_ORDER_STATUSES = new Set(["approved", "preparing", "prepared", "readyForDispatch"]);
const DASHBOARD_PENDING_GUARD_STATUSES = new Set(["pending", "assigned"]);
const DASHBOARD_PROCESSING_GUARD_STATUSES = new Set(["preparing", "ready"]);
const DASHBOARD_FINAL_GUARD_STATUSES = new Set(["dispatched", "delivered", "failed", "rescheduled", "cancelled"]);

function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}

function sameUtcDay(left: string, right: string): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return leftDate.getUTCFullYear() === rightDate.getUTCFullYear()
    && leftDate.getUTCMonth() === rightDate.getUTCMonth()
    && leftDate.getUTCDate() === rightDate.getUTCDate();
}

function sameUtcMonth(left: string, right: string): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return leftDate.getUTCFullYear() === rightDate.getUTCFullYear()
    && leftDate.getUTCMonth() === rightDate.getUTCMonth();
}

function addUtcDays(date: string, days: number): string {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function latestIso(dates: readonly string[]): string {
  return dates.reduce((latest, date) => (new Date(date).getTime() > new Date(latest).getTime() ? date : latest));
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function getTrendLabel(current: number, previous: number, fallback: string): { readonly label: string; readonly direction: DashboardTrendDirection } {
  if (previous <= 0) {
    return { label: fallback, direction: current > 0 ? "up" : "flat" };
  }

  const delta = current - previous;
  const percentage = Math.round((delta / previous) * 100);
  if (percentage === 0) {
    return { label: "Sin variación", direction: "flat" };
  }

  return {
    label: `${percentage > 0 ? "+" : ""}${percentage}% vs. período anterior`,
    direction: percentage > 0 ? "up" : "down",
  };
}

function toneForOrderStatus(status: string): DashboardTone {
  if (DASHBOARD_FINAL_GUARD_STATUSES.has(status)) {
    return "success";
  }

  if (DASHBOARD_PROCESSING_ORDER_STATUSES.has(status)) {
    return "primary";
  }

  if (DASHBOARD_PENDING_ORDER_STATUSES.has(status)) {
    return "warning";
  }

  return "muted";
}

function toneForQuoteStatus(status: string): DashboardTone {
  if (status === "accepted" || status === "converted") {
    return "success";
  }

  if (status === "pendingApproval" || status === "sent" || status === "draft") {
    return "warning";
  }

  if (status === "rejected" || status === "expired" || status === "cancelled") {
    return "danger";
  }

  return "muted";
}

function toneForApprovalStatus(status: string): DashboardTone {
  if (status === "approved") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  if (status === "rejected" || status === "cancelled") {
    return "danger";
  }

  return "muted";
}

function getOrderActivityTitle(status: string): string {
  if (status === "draft") {
    return "Pedido creado";
  }

  if (status === "pendingApproval") {
    return "Pedido pendiente de aprobación";
  }

  if (status === "approved") {
    return "Pedido aprobado";
  }

  if (status === "preparing") {
    return "Pedido en preparación";
  }

  if (status === "prepared") {
    return "Pedido preparado";
  }

  if (status === "readyForDispatch") {
    return "Pedido listo para despacho";
  }

  if (status === "dispatched") {
    return "Pedido enviado";
  }

  if (status === "delivered") {
    return "Pedido entregado";
  }

  if (status === "sentToTango") {
    return "Pedido sincronizado con Tango";
  }

  if (status === "invoiced") {
    return "Pedido facturado";
  }

  return "Pedido cancelado";
}

function getOrderActivityDescription(number: string, clientName: string, total: number): string {
  return `${number} · ${clientName} · ${formatCurrency(total)}`;
}

function getLatestOrderActivity(): DashboardActivityItem | null {
  const latestOrder = [...MOCK_ORDER_RECORDS].sort((left, right) => new Date(right.order.updatedAt).getTime() - new Date(left.order.updatedAt).getTime())[0];
  if (latestOrder === undefined) {
    return null;
  }

  return {
    id: latestOrder.order.id,
    title: getOrderActivityTitle(latestOrder.order.status),
    description: getOrderActivityDescription(latestOrder.order.number, latestOrder.detail.clientName, latestOrder.order.total),
    date: latestOrder.order.updatedAt,
    icon: ShoppingCart,
    tone: toneForOrderStatus(latestOrder.order.status),
    to: `/orders/${latestOrder.order.id}`,
  };
}

function getLatestQuoteActivity(): DashboardActivityItem | null {
  const latestQuote = [...MOCK_QUOTES].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
  if (latestQuote === undefined) {
    return null;
  }

  const clientName = MOCK_CLIENTS.find((client) => client.id === latestQuote.clientId)?.legalName ?? "Cliente no encontrado";
  return {
    id: latestQuote.id,
    title: `Cotización ${getQuoteStatusLabel(latestQuote.status).toLowerCase()}`,
    description: `${latestQuote.number} · ${clientName} · ${formatCurrency(latestQuote.total)}`,
    date: latestQuote.updatedAt,
    icon: FileText,
    tone: toneForQuoteStatus(latestQuote.status),
    to: `/quotes/${latestQuote.id}`,
  };
}

function getLatestApprovalActivity(): DashboardActivityItem | null {
  const latestApproval = [...MOCK_APPROVAL_RECORDS].sort((left, right) => {
    const leftDate = new Date(left.request.resolvedAt ?? left.request.createdAt).getTime();
    const rightDate = new Date(right.request.resolvedAt ?? right.request.createdAt).getTime();
    return rightDate - leftDate;
  })[0];
  if (latestApproval === undefined) {
    return null;
  }

  const approvalDate = latestApproval.request.resolvedAt ?? latestApproval.request.createdAt;
  return {
    id: latestApproval.request.id,
    title: `Autorización ${getApprovalStatusLabel(latestApproval.request.status).toLowerCase()}`,
    description: `${latestApproval.number} · ${latestApproval.clientName}`,
    date: approvalDate,
    icon: ShieldCheck,
    tone: toneForApprovalStatus(latestApproval.request.status),
    to: `/approvals/${latestApproval.request.id}`,
  };
}

function getLatestClientActivity(): DashboardActivityItem | null {
  const latestClient = [...MOCK_CLIENTS].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
  if (latestClient === undefined) {
    return null;
  }

  return {
    id: latestClient.id,
    title: "Cliente nuevo",
    description: `${latestClient.code} · ${latestClient.legalName}`,
    date: latestClient.updatedAt,
    icon: UsersRound,
    tone: "primary",
    to: `/clients/${latestClient.id}`,
  };
}

function getLatestMissingItemActivity(): DashboardActivityItem | null {
  const missingCandidates = getLogisticsOrderList().flatMap((detail) => detail.missingItems.map((item) => ({
    id: `${detail.orderId}-${item.id}`,
    date: item.reportedAt,
    detail,
    item,
  })));
  const latestMissing = missingCandidates.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0];
  if (latestMissing === undefined) {
    return null;
  }

  return {
    id: latestMissing.id,
    title: "Faltante registrado",
    description: `${latestMissing.detail.orderNumber} · ${latestMissing.item.productCode} · ${latestMissing.item.missingQuantity} faltante(s)`,
    date: latestMissing.date,
    icon: AlertTriangle,
    tone: "warning",
    to: `/logistics/orders/${latestMissing.detail.orderId}`,
  };
}

function getLatestLowStockActivity(): DashboardActivityItem | null {
  const lowStockProduct = [...MOCK_PRODUCT_RECORDS]
    .filter((record) => record.stockState !== "ok")
    .sort((left, right) => new Date(right.product.updatedAt).getTime() - new Date(left.product.updatedAt).getTime())[0];

  if (lowStockProduct === undefined) {
    return null;
  }

  return {
    id: lowStockProduct.product.id,
    title: lowStockProduct.stockState === "empty" ? "Producto sin stock" : "Stock mínimo alcanzado",
    description: `${lowStockProduct.product.internalCode} · ${lowStockProduct.product.name} · ${lowStockProduct.product.stockQuantity} unidades`,
    date: lowStockProduct.product.updatedAt,
    icon: Boxes,
    tone: lowStockProduct.stockState === "empty" ? "danger" : "warning",
    to: `/products/${lowStockProduct.product.id}`,
  };
}

function buildActivity(): readonly DashboardActivityItem[] {
  return [
    getLatestOrderActivity(),
    getLatestQuoteActivity(),
    getLatestApprovalActivity(),
    getLatestClientActivity(),
    getLatestMissingItemActivity(),
    getLatestLowStockActivity(),
  ].filter((item): item is DashboardActivityItem => item !== null).sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function buildMetrics(): readonly DashboardMetric[] {
  const finalizedOrders = MOCK_ORDER_RECORDS.filter((record) => DASHBOARD_FINANCIAL_STATUSES.has(record.order.status));
  const orderReferenceDate = latestIso(finalizedOrders.length > 0 ? finalizedOrders.map((record) => record.order.updatedAt) : MOCK_ORDER_RECORDS.map((record) => record.order.updatedAt));
  const dayOrders = finalizedOrders.filter((record) => sameUtcDay(record.order.updatedAt, orderReferenceDate));
  const previousDayOrders = finalizedOrders.filter((record) => sameUtcDay(record.order.updatedAt, addUtcDays(orderReferenceDate, -1)));
  const monthOrders = finalizedOrders.filter((record) => sameUtcMonth(record.order.updatedAt, orderReferenceDate));
  const firstHalfMonthTotal = sum(monthOrders.filter((record) => new Date(record.order.updatedAt).getUTCDate() <= 15).map((record) => record.order.total));
  const secondHalfMonthTotal = sum(monthOrders.filter((record) => new Date(record.order.updatedAt).getUTCDate() > 15).map((record) => record.order.total));

  const salesDayTotal = sum(dayOrders.map((record) => record.order.total));
  const salesMonthTotal = sum(monthOrders.map((record) => record.order.total));
  const dayTrend = getTrendLabel(salesDayTotal, sum(previousDayOrders.map((record) => record.order.total)), "Primer día con ventas en el corte");
  const monthTrend = getTrendLabel(secondHalfMonthTotal, firstHalfMonthTotal, "Actividad concentrada en la segunda quincena");

  const pendingOrders = MOCK_ORDER_RECORDS.filter((record) => DASHBOARD_PENDING_ORDER_STATUSES.has(record.order.status)).length;
  const preparedOrders = MOCK_ORDER_RECORDS.filter((record) => record.order.status === "prepared" || record.order.status === "readyForDispatch").length;
  const dispatchedOrders = MOCK_ORDER_RECORDS.filter((record) => record.order.status === "dispatched" || record.order.status === "delivered").length;
  const pendingQuotes = MOCK_QUOTES.filter((quote) => quote.status === "draft" || quote.status === "pendingApproval" || quote.status === "sent").length;
  const activeClients = MOCK_CLIENTS.filter((client) => client.status === "active" && client.commercialStatus === "active").length;
  const lowStockProducts = MOCK_PRODUCT_RECORDS.filter((record) => record.stockState !== "ok").length;

  return [
    {
      title: "Ventas del día",
      value: formatCurrency(salesDayTotal),
      description: "Facturación del último corte comercial.",
      trendLabel: dayTrend.label,
      trendDirection: dayTrend.direction,
      icon: ShoppingCart,
      tone: "success",
    },
    {
      title: "Ventas del mes",
      value: formatCurrency(salesMonthTotal),
      description: "Acumulado operativo del período.",
      trendLabel: monthTrend.label,
      trendDirection: monthTrend.direction,
      icon: ArrowUpRight,
      tone: "primary",
    },
    {
      title: "Pedidos pendientes",
      value: formatCount(pendingOrders),
      description: "Pedidos abiertos o en espera de aprobación.",
      icon: Clock3,
      tone: "warning",
      to: "/orders",
    },
    {
      title: "Pedidos preparados",
      value: formatCount(preparedOrders),
      description: "Pedidos listos para pasar a despacho.",
      icon: PackageCheck,
      tone: "success",
      to: "/logistics",
    },
    {
      title: "Pedidos despachados",
      value: formatCount(dispatchedOrders),
      description: "Pedidos ya entregados al circuito logístico.",
      icon: Truck,
      tone: "primary",
      to: "/dispatch",
    },
    {
      title: "Cotizaciones pendientes",
      value: formatCount(pendingQuotes),
      description: "Borradores, enviadas y pendientes de resolución.",
      icon: FileText,
      tone: "warning",
      to: "/quotes",
    },
    {
      title: "Clientes activos",
      value: formatCount(activeClients),
      description: "Carpeta comercial con estado activo.",
      trendLabel: `${formatCount(MOCK_CLIENTS.filter((client) => sameUtcMonth(client.createdAt, orderReferenceDate) && client.status === "active").length)} altas recientes`,
      trendDirection: "up",
      icon: UsersRound,
      tone: "muted",
      to: "/clients",
    },
    {
      title: "Productos con bajo stock",
      value: formatCount(lowStockProducts),
      description: "Productos por debajo del mínimo o sin stock.",
      trendLabel: `${formatCount(MOCK_PRODUCT_RECORDS.filter((record) => record.stockState === "empty").length)} sin stock`,
      trendDirection: lowStockProducts > 0 ? "down" : "flat",
      icon: Boxes,
      tone: lowStockProducts > 0 ? "danger" : "success",
      to: "/products",
    },
  ];
}

function buildOperationalGroups(): readonly DashboardStatusGroup[] {
  const orderGroups: DashboardStatusGroup = {
    title: "Pedidos",
    description: "Estado comercial del circuito de ventas.",
    icon: ShoppingCart,
    tone: "primary",
    to: "/orders",
    items: [
      { label: "Pendientes", value: MOCK_ORDER_RECORDS.filter((record) => DASHBOARD_PENDING_ORDER_STATUSES.has(record.order.status)).length },
      { label: "En proceso", value: MOCK_ORDER_RECORDS.filter((record) => DASHBOARD_PROCESSING_ORDER_STATUSES.has(record.order.status)).length },
      { label: "Finalizados", value: MOCK_ORDER_RECORDS.filter((record) => !DASHBOARD_PENDING_ORDER_STATUSES.has(record.order.status) && !DASHBOARD_PROCESSING_ORDER_STATUSES.has(record.order.status)).length },
    ],
  };

  const logisticsSummary = getLogisticsSummary();
  const logisticsGroup: DashboardStatusGroup = {
    title: "Logística",
    description: "Preparación y despacho operativo.",
    icon: Truck,
    tone: "success",
    to: "/logistics",
    items: [
      { label: "Pendientes", value: logisticsSummary.pendingPreparation },
      { label: "En proceso", value: logisticsSummary.preparing + logisticsSummary.withMissingItems },
      { label: "Finalizados", value: logisticsSummary.readyForDispatch + logisticsSummary.dispatchedToday },
    ],
  };

  const approvalPending = MOCK_APPROVAL_RECORDS.filter((record) => record.request.status === "pending").length;
  const approvalResolved = MOCK_APPROVAL_RECORDS.filter((record) => record.request.status !== "pending").length;
  const approvalsGroup: DashboardStatusGroup = {
    title: "Autorizaciones",
    description: "Solicitudes comerciales y de riesgo.",
    icon: ShieldCheck,
    tone: "warning",
    to: "/approvals",
    items: [
      { label: "Pendientes", value: approvalPending },
      { label: "En proceso", value: 0 },
      { label: "Finalizadas", value: approvalResolved },
    ],
  };

  const guides = getDispatchGuideList();
  const dispatchPending = guides.filter((guide) => DASHBOARD_PENDING_GUARD_STATUSES.has(guide.status)).length;
  const dispatchProcessing = guides.filter((guide) => DASHBOARD_PROCESSING_GUARD_STATUSES.has(guide.status)).length;
  const dispatchFinalized = guides.filter((guide) => DASHBOARD_FINAL_GUARD_STATUSES.has(guide.status)).length;
  const guidesGroup: DashboardStatusGroup = {
    title: "Guías de despacho",
    description: "Seguimiento de reparto y entrega.",
    icon: PackageCheck,
    tone: "primary",
    to: "/dispatch",
    items: [
      { label: "Pendientes", value: dispatchPending },
      { label: "En proceso", value: dispatchProcessing },
      { label: "Finalizadas", value: dispatchFinalized },
    ],
  };

  return [orderGroups, logisticsGroup, approvalsGroup, guidesGroup];
}

function buildAlerts(): readonly DashboardAlertItem[] {
  const alerts: DashboardAlertItem[] = [];
  const lowStockProducts = MOCK_PRODUCT_RECORDS.filter((record) => record.stockState !== "ok").length;
  const pendingDeliveries = getLogisticsSummary().pendingDeliveries;
  const approvalPending = MOCK_APPROVAL_RECORDS.filter((record) => record.request.status === "pending").length;
  const latestOrderDate = latestIso(MOCK_ORDER_RECORDS.map((record) => record.order.updatedAt));
  const delayedOrders = MOCK_ORDER_RECORDS.filter((record) => {
    if (!DASHBOARD_PENDING_ORDER_STATUSES.has(record.order.status) && !DASHBOARD_PROCESSING_ORDER_STATUSES.has(record.order.status)) {
      return false;
    }

    const elapsedDays = Math.floor((new Date(latestOrderDate).getTime() - new Date(record.order.updatedAt).getTime()) / (24 * 60 * 60 * 1000));
    return elapsedDays >= 7;
  }).length;

    if (lowStockProducts > 0) {
    alerts.push({
      id: "low-stock",
      title: "Stock mínimo",
      description: `${formatCount(lowStockProducts)} productos necesitan reposición inmediata.`,
      icon: Boxes,
      tone: "danger",
      to: "/products",
    });
  }

  if (delayedOrders > 0) {
    alerts.push({
      id: "delayed-orders",
      title: "Pedido demorado",
      description: `${formatCount(delayedOrders)} pedidos superaron la ventana de seguimiento.`,
      icon: Clock3,
      tone: "warning",
      to: "/orders",
    });
  }

  if (pendingDeliveries > 0) {
    alerts.push({
      id: "pending-deliveries",
      title: "Entrega pendiente",
      description: `${formatCount(pendingDeliveries)} entregas siguen abiertas en logística.`,
      icon: Truck,
      tone: "warning",
      to: "/dispatch",
    });
  }

  if (approvalPending > 0) {
    alerts.push({
      id: "pending-approvals",
      title: "Autorización pendiente",
      description: `${formatCount(approvalPending)} solicitudes esperan resolución.`,
      icon: ShieldCheck,
      tone: "warning",
      to: "/approvals",
    });
  }

  return alerts;
}

function buildQuickLinks(): readonly DashboardQuickLink[] {
  return [
    { title: "Clientes", description: "Abrir cuenta comercial y ficha.", path: "/clients", icon: UsersRound },
    { title: "Productos", description: "Ver catálogo y stock.", path: "/products", icon: Package },
    { title: "Pedidos", description: "Gestionar el circuito comercial.", path: "/orders", icon: ShoppingCart },
    { title: "Logística", description: "Controlar preparación y despacho.", path: "/logistics", icon: Truck },
    { title: "Cotizaciones", description: "Revisar oportunidades y presupuestos.", path: "/quotes", icon: FileText },
    { title: "Guías", description: "Seguir el reparto y las entregas.", path: "/dispatch", icon: PackageCheck },
  ];
}

export const DASHBOARD_MODEL: DashboardModel = Object.freeze({
  metrics: buildMetrics(),
  activity: buildActivity(),
  operationalStatus: buildOperationalGroups(),
  alerts: buildAlerts(),
  quickLinks: buildQuickLinks(),
});

export { TONE_CLASS_NAMES, ALERT_TONE_CLASS_NAMES, ArrowDownRight, ArrowRight, ArrowUpRight };
