import type { Client, ClientAddress } from "@/domain/client/client";
import type { Order, OrderStatus } from "@/domain/order/order";
import type { Product } from "@/domain/product/product";
import type { BranchId, ClientId, CompanyId, DispatchGuideId, DispatchGuideItemId, OrderId, ProductFamilyId, ProductId, UserId } from "@/domain/shared";
import type { DispatchGuideItem, DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import type { Delivery, DeliveryStatus } from "@/domain/dispatch/delivery";
import { MOCK_CLIENTS, MOCK_SELLERS } from "@/features/clients/data/mock-clients";
import { MOCK_PRODUCTS } from "@/features/products/data/mock-products";
import { MOCK_ORDER_RECORDS } from "@/features/orders/data/mock-orders";
import type {
  LogisticsFilters,
  LogisticsHistoryEntry,
  LogisticsMissingItem,
  LogisticsOrderDetail,
  LogisticsPreparationItem,
  LogisticsSummary,
  PreparationStatus,
} from "../types";
import type {
  DispatchDriver,
  DispatchGuideDetail,
  DispatchGuideFormValues,
  DispatchHistoryEntry,
  DispatchVehicle,
  DispatchZone,
} from "@/features/dispatch/types";
import type { DispatchDeliveryConfirmationValues, DispatchDeliveryFailureValues, DispatchDeliveryRescheduleValues } from "@/features/dispatch/types";
import { createDispatchGuideNumber } from "@/features/dispatch/utils/dispatch-rules";

const asId = <T extends string>(value: string): T => value as T;
const toIso = (value: Date): string => value.toISOString();
const NOW = new Date("2025-07-10T12:00:00.000Z");

const REQUESTED_BY_USERS: readonly UserId[] = [
  asId<UserId>("user-logistics-1"),
  asId<UserId>("user-warehouse-1"),
  asId<UserId>("user-admin-1"),
];

function getClient(clientId: ClientId): Client {
  const client = MOCK_CLIENTS.find((item) => item.id === clientId);
  if (client === undefined) {
    throw new Error("Cliente no encontrado.");
  }

  return client;
}

function getSellerName(client: Client): string | undefined {
  return MOCK_SELLERS.find((seller) => seller.id === client.assignedSellerId)?.label;
}

function getProduct(productId: ProductId): Product {
  const product = MOCK_PRODUCTS.find((item) => item.id === productId);
  if (product === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[logistics] Producto no encontrado para productId=${productId}. Se devolverá un placeholder defensivo.`);
    }

    return {
      id: productId,
      companyId: asId<CompanyId>("company-cba"),
      branchId: asId<BranchId>("branch-central"),
      internalCode: "MISSING",
      name: "Producto no encontrado",
      description: "Registro de respaldo generado porque el catálogo simulado no contiene este producto.",
      familyId: asId<ProductFamilyId>("family-fasteners"),
      measure: "Unidad",
      unitOfMeasure: "unit",
      basePrice: 0,
      stockQuantity: 0,
      status: "inactive",
      createdAt: toIso(NOW),
      updatedAt: toIso(NOW),
    };
  }

  return product;
}

function getLocality(address: ClientAddress): string {
  return address.city;
}

function getPreparationStatus(orderStatus: OrderStatus, hasMissingItems: boolean): PreparationStatus {
  if (orderStatus === "cancelled") {
    return "pending";
  }

  if (orderStatus === "readyForDispatch") {
    return "prepared";
  }

  if (orderStatus === "dispatched" || orderStatus === "delivered") {
    return hasMissingItems ? "partial" : "prepared";
  }

  if (orderStatus === "preparing") {
    return hasMissingItems ? "partial" : "preparing";
  }

  if (orderStatus === "prepared") {
    return "prepared";
  }

  return "pending";
}

function getDispatchStatus(orderStatus: OrderStatus): DispatchGuideStatus | "none" {
  switch (orderStatus) {
    case "readyForDispatch":
      return "ready";
    case "dispatched":
      return "dispatched";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "preparing":
    case "prepared":
      return "preparing";
    default:
      return "none";
  }
}

function getDeliveryStatus(orderStatus: OrderStatus): DeliveryStatus | "none" {
  switch (orderStatus) {
    case "dispatched":
      return "pending";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "failed";
    default:
      return "none";
  }
}

function buildPreparationItems(order: Order): readonly LogisticsPreparationItem[] {
  return order.items.map((item, index) => {
    const product = getProduct(item.productId);
    const preparedQuantity = order.status === "prepared" || order.status === "readyForDispatch" || order.status === "dispatched" || order.status === "delivered"
      ? item.quantity
      : order.status === "preparing"
        ? Math.max(0, item.quantity - (index % 2 === 0 ? 1 : 0))
        : 0;
    const missingQuantity = Math.max(0, item.quantity - preparedQuantity);
    const status: LogisticsPreparationItem["status"] = preparedQuantity === 0 ? "pending" : missingQuantity > 0 ? "partial" : "prepared";

    return {
      id: `${order.id}-prep-${index + 1}`,
      productId: item.productId,
      code: product.internalCode,
      description: item.description,
      requestedQuantity: item.quantity,
      preparedQuantity,
      missingQuantity,
      unitOfMeasure: product.unitOfMeasure,
      location: `Sector ${String.fromCharCode(65 + (index % 4))}-${index + 1}`,
      ...(missingQuantity > 0 ? { notes: "Requiere revisión de preparación." } : {}),
      status,
    };
  });
}

function buildMissingItems(order: Order, items: readonly LogisticsPreparationItem[]): readonly LogisticsMissingItem[] {
  return items
    .filter((item) => item.missingQuantity > 0)
    .map((item, index) => {
      const missingItem: LogisticsMissingItem = {
        id: `${order.id}-missing-${index + 1}`,
        productId: item.productId,
        productCode: item.code,
        productDescription: item.description,
        requestedQuantity: item.requestedQuantity,
        preparedQuantity: item.preparedQuantity,
        missingQuantity: item.missingQuantity,
        reason: index % 5 === 0 ? "outOfStock" : index % 5 === 1 ? "damaged" : index % 5 === 2 ? "incorrectProduct" : index % 5 === 3 ? "locationNotFound" : "pendingReplenishment",
        notes: "Faltante simulado registrado por logística.",
        reportedBy: REQUESTED_BY_USERS[index % REQUESTED_BY_USERS.length] ?? asId<UserId>("user-logistics-1"),
        reportedAt: toIso(new Date(NOW.getTime() - index * 60 * 60 * 1000)),
        resolutionStatus: index % 2 === 0 ? "pending" : "accepted",
      };

      return missingItem;
    });
}

function buildHistory(order: Order, title: string, description: string, status?: LogisticsHistoryEntry["status"]): LogisticsHistoryEntry[] {
  const created = createLogisticsHistoryEntry(order.id, "Pedido recibido", "El pedido ingresó al circuito operativo de logística.", order.status, order.createdAt);
  const current = status !== undefined
    ? createLogisticsHistoryEntry(order.id, title, description, status, order.updatedAt)
    : {
        id: `${order.id}-history-current`,
        orderId: order.id,
        date: order.updatedAt,
        title,
        description,
      };

  return [
    created,
    current,
  ];
}

function buildGuideItems(order: Order, preparationItems: readonly LogisticsPreparationItem[]): readonly DispatchGuideItem[] {
  return preparationItems
    .filter((item) => item.preparedQuantity > 0)
    .map((item, index) => {
      const guideItem: DispatchGuideItem = {
        id: asId<DispatchGuideItemId>(`${order.id}-guide-item-${index + 1}`),
        dispatchGuideId: asId<DispatchGuideId>(`${order.id}-guide`),
        productId: item.productId,
        description: item.description,
        quantity: item.preparedQuantity,
        unitOfMeasure: item.unitOfMeasure,
      };

      const orderItem = order.items[index];
      if (orderItem?.id !== undefined) {
        return { ...guideItem, orderItemId: orderItem.id };
      }

      return guideItem;
    });
}

function createLogisticsHistoryEntry(orderId: OrderId, title: string, description: string, status: NonNullable<LogisticsHistoryEntry["status"]>, date = toIso(new Date())): LogisticsHistoryEntry {
  return {
    id: `${orderId}-history-${Date.now()}`,
    orderId,
    date,
    title,
    description,
    status,
  };
}

function createDispatchGuideHistoryEntry(
  dispatchGuideId: DispatchGuideId,
  orderId: OrderId,
  title: string,
  description: string,
  status: DispatchHistoryEntry["status"] | undefined,
  date = toIso(new Date()),
): DispatchHistoryEntry {
  const entry: DispatchHistoryEntry = {
    id: `${dispatchGuideId}-history-${Date.now()}`,
    dispatchGuideId,
    orderId,
    date,
    title,
    description,
    ...(status !== undefined ? { status } : {}),
  };

  return entry;
}

interface LogisticsState {
  readonly orders: Map<OrderId, LogisticsOrderDetail>;
  readonly guides: Map<DispatchGuideId, DispatchGuideDetail>;
  readonly drivers: readonly DispatchDriver[];
  readonly vehicles: readonly DispatchVehicle[];
  readonly zones: readonly DispatchZone[];
  nextGuideSequence: number;
}

function buildDrivers(): readonly DispatchDriver[] {
  return [
    { id: "driver-1", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), userId: asId<UserId>("user-logistics-1"), name: "Sergio López", phone: "+54 351 600 1001", status: "available" },
    { id: "driver-2", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), userId: asId<UserId>("user-logistics-2"), name: "Luciana Pérez", phone: "+54 351 600 1002", status: "assigned" },
    { id: "driver-3", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-north"), userId: asId<UserId>("user-logistics-3"), name: "Martín Sosa", phone: "+54 351 600 1003", status: "available" },
    { id: "driver-4", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-west"), name: "Rocío Luna", phone: "+54 351 600 1004", status: "inactive" },
  ] as const;
}

function buildVehicles(): readonly DispatchVehicle[] {
  return [
    { id: "vehicle-1", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), code: "VAN-01", plate: "AG-123-CD", description: "Camión liviano Iveco Daily", capacity: 1500, status: "available" },
    { id: "vehicle-2", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), code: "VAN-02", plate: "AG-124-CD", description: "Pick-up Toyota Hilux", capacity: 900, status: "assigned" },
    { id: "vehicle-3", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-north"), code: "VAN-03", plate: "AG-125-CD", description: "Camioneta utilitaria", capacity: 700, status: "maintenance" },
    { id: "vehicle-4", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-west"), code: "VAN-04", plate: "AG-126-CD", description: "Furgón repartidor", capacity: 1100, status: "available" },
  ] as const;
}

function buildZones(): readonly DispatchZone[] {
  return [
    { id: "zone-centro", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), name: "Centro", localities: ["Córdoba", "Villa Carlos Paz"], status: "active" },
    { id: "zone-norte", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-north"), name: "Norte", description: "Corredor norte", localities: ["Jesús María", "Colonia Caroya"], status: "active" },
    { id: "zone-sur", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-west"), name: "Sur", description: "Zona de ruta", localities: ["Río Cuarto", "General Cabrera"], status: "active" },
    { id: "zone-mix", companyId: asId<CompanyId>("company-cba"), branchId: asId<BranchId>("branch-central"), name: "Mixta", localities: ["Alta Gracia", "Malagueño"], status: "inactive" },
  ] as const;
}

function buildBaseState(): LogisticsState {
  const drivers = buildDrivers();
  const vehicles = buildVehicles();
  const zones = buildZones();
  const orders = new Map<OrderId, LogisticsOrderDetail>();
  const guides = new Map<DispatchGuideId, DispatchGuideDetail>();
  let nextGuideSequence = 1;

  for (const record of MOCK_ORDER_RECORDS) {
    const order = record.order;
    const client = getClient(order.clientId);
    const address = client.addresses[0];
    if (address === undefined) {
      continue;
    }

    const preparationItems = buildPreparationItems(order);
    const missingItems = buildMissingItems(order, preparationItems);
    const preparationStatus = getPreparationStatus(order.status, missingItems.length > 0);
    const guideStatus = getDispatchStatus(order.status);
    const deliveryStatus = getDeliveryStatus(order.status);
    const hasGuide = guideStatus !== "none" || order.status === "prepared" || order.status === "readyForDispatch" || order.status === "dispatched" || order.status === "delivered";
    const guideId = hasGuide ? asId<DispatchGuideId>(`${order.id}-guide`) : undefined;
    const zone = zones[order.branchId === asId<BranchId>("branch-north") ? 1 : order.branchId === asId<BranchId>("branch-west") ? 2 : 0];
    const driver = drivers[order.status === "dispatched" || order.status === "delivered" ? 1 : order.status === "readyForDispatch" ? 0 : 2];
    const vehicle = vehicles[order.status === "dispatched" || order.status === "delivered" ? 1 : 0];
    const guideItems = hasGuide ? buildGuideItems(order, preparationItems) : [];
    const baseGuide: DispatchGuideDetail | undefined = guideId === undefined
      ? undefined
      : {
          id: guideId,
          companyId: order.companyId,
          branchId: order.branchId,
          orderId: order.id,
          number: createDispatchGuideNumber(nextGuideSequence++),
          clientId: order.clientId,
          deliveryAddressId: address.id,
          status: guideStatus === "none" ? "pending" : guideStatus,
          items: guideItems,
          orderNumber: order.number,
          clientName: client.legalName,
          tradeName: client.tradeName,
          locality: address.city,
          driverId: driver?.id,
          driverName: driver?.name,
          vehicleId: vehicle?.id,
          vehicleCode: vehicle?.code,
          vehicle: vehicle?.code,
          zoneId: zone?.id,
          zoneName: zone?.name,
          scheduledDate: toIso(new Date(NOW.getTime() + 24 * 60 * 60 * 1000)),
          scheduledTimeRange: undefined,
          deliveryStatus: deliveryStatus === "none" ? "pending" : deliveryStatus,
          ...(guideItems.length > 0 ? { packageCount: Math.max(1, Math.ceil(guideItems.reduce((total, item) => total + item.quantity, 0) / 4)) } : {}),
          totalWeight: Math.round(guideItems.reduce((total, item) => total + item.quantity * 1.8, 0) * 100) / 100,
          observations: order.status === "readyForDispatch" ? "Salida prevista para el día siguiente." : "Documento operativo interno. No reemplaza remitos ni comprobantes fiscales.",
          order,
          client,
          address,
          delivery: deliveryStatus === "delivered" ? {
            id: `${guideId}-delivery`,
            companyId: order.companyId,
            branchId: order.branchId,
            orderId: order.id,
            dispatchGuideId: guideId,
            status: "delivered",
            recipientName: "Recepción central",
            createdBy: REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1"),
            createdAt: order.updatedAt,
            updatedAt: order.updatedAt,
          } : undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          deliveredAt: deliveryStatus === "delivered" ? order.updatedAt : undefined,
          history: [
            createDispatchGuideHistoryEntry(
              guideId,
              order.id,
              "Guía creada",
              "La guía fue generada a partir del pedido operativo.",
              guideStatus === "none" ? "pending" : guideStatus,
              order.updatedAt,
            ),
          ],
        };

    const detail: LogisticsOrderDetail = {
      companyId: order.companyId,
      orderId: order.id,
      orderNumber: order.number,
      orderDate: order.createdAt,
      clientId: order.clientId,
      clientName: client.legalName,
      tradeName: client.tradeName,
      locality: getLocality(address),
      branchId: order.branchId,
      sellerName: getSellerName(client),
      productsCount: order.items.length,
      unitsCount: order.items.reduce((total, item) => total + item.quantity, 0),
      orderStatus: order.status,
      preparationStatus,
      dispatchStatus: guideStatus,
          deliveryStatus: deliveryStatus === "none" ? "pending" : deliveryStatus,
      expectedDate: guideStatus === "none" || guideId === undefined ? undefined : toIso(new Date(NOW.getTime() + 24 * 60 * 60 * 1000)),
      dispatchGuideId: guideId,
      dispatchGuideNumber: baseGuide?.number,
      driverName: driver?.name,
      vehicleCode: vehicle?.code,
      deliveryZone: zone?.name,
      hasMissingItems: missingItems.length > 0,
      pendingAuthorization: order.status === "pendingApproval",
      blockedByCredit: client.status === "blocked" || client.commercialStatus === "blocked" || order.status === "pendingApproval",
      canStartPreparation: order.status === "approved",
      canContinuePreparation: order.status === "approved" || order.status === "preparing",
      canCreateGuide: order.status === "prepared" || order.status === "readyForDispatch",
      canDispatch: order.status === "readyForDispatch" || order.status === "prepared",
      canViewGuide: guideId !== undefined,
      order,
      client,
      address,
      items: preparationItems,
      missingItems,
      guide: baseGuide,
      delivery: baseGuide?.delivery,
      history: buildHistory(order, "Estado operativo", `El pedido quedó en estado ${order.status}.`, order.status),
      observations: order.notes ?? undefined,
    };

    orders.set(order.id, detail);
    if (baseGuide !== undefined) {
      guides.set(baseGuide.id, baseGuide);
    }
  }

  return { orders, guides, drivers, vehicles, zones, nextGuideSequence };
}

const state = buildBaseState();

function cloneHistoryEntry(entry: LogisticsHistoryEntry): LogisticsHistoryEntry {
  return { ...entry };
}

function cloneMissingItem(item: LogisticsMissingItem): LogisticsMissingItem {
  return { ...item };
}

function clonePreparationItem(item: LogisticsPreparationItem): LogisticsPreparationItem {
  return { ...item };
}

function cloneOrderDetail(detail: LogisticsOrderDetail): LogisticsOrderDetail {
  return {
    ...detail,
    order: { ...detail.order, items: detail.order.items.map((item) => ({ ...item })) },
    client: { ...detail.client, addresses: detail.client.addresses.map((address) => ({ ...address })) },
    address: { ...detail.address },
    items: detail.items.map((item) => clonePreparationItem(item)),
    missingItems: detail.missingItems.map((item) => cloneMissingItem(item)),
    guide: detail.guide === undefined ? undefined : cloneGuideDetail(detail.guide),
    delivery: detail.delivery === undefined ? undefined : { ...detail.delivery },
    history: detail.history.map((entry) => cloneHistoryEntry(entry)),
    observations: detail.observations,
  };
}

function cloneGuideDetail(detail: DispatchGuideDetail): DispatchGuideDetail {
  return {
    ...detail,
    items: detail.items.map((item) => ({ ...item })),
    delivery: detail.delivery === undefined ? undefined : { ...detail.delivery },
    history: detail.history.map((entry) => ({ ...entry })),
    order: { ...detail.order, items: detail.order.items.map((item) => ({ ...item })) },
    client: { ...detail.client, addresses: detail.client.addresses.map((address) => ({ ...address })) },
    address: { ...detail.address },
  };
}

function syncOrderProgress(detail: LogisticsOrderDetail): LogisticsOrderDetail {
  const nextPreparationStatus = getPreparationStatus(detail.order.status, detail.missingItems.length > 0);
  const nextDispatchStatus = detail.guide?.status ?? getDispatchStatus(detail.order.status);
  const nextDeliveryStatus = detail.delivery?.status ?? getDeliveryStatus(detail.order.status);
  return {
    ...detail,
    preparationStatus: nextPreparationStatus,
    dispatchStatus: nextDispatchStatus,
    deliveryStatus: nextDeliveryStatus,
    canStartPreparation: detail.order.status === "approved",
    canContinuePreparation: detail.order.status === "approved" || detail.order.status === "preparing",
    canCreateGuide: detail.order.status === "prepared" || detail.order.status === "readyForDispatch",
    canDispatch: detail.order.status === "readyForDispatch" || detail.order.status === "prepared",
    canViewGuide: detail.guide !== undefined,
  };
}

function setOrderDetail(orderId: OrderId, updater: (current: LogisticsOrderDetail) => LogisticsOrderDetail): LogisticsOrderDetail {
  const current = state.orders.get(orderId);
  if (current === undefined) {
    throw new Error("Pedido no encontrado.");
  }

  const next = updater(cloneOrderDetail(current));
  state.orders.set(orderId, next);
  if (next.guide !== undefined) {
    state.guides.set(next.guide.id, next.guide);
  }
  return cloneOrderDetail(next);
}

function setGuideDetail(guideId: DispatchGuideId, updater: (current: DispatchGuideDetail) => DispatchGuideDetail): DispatchGuideDetail {
  const current = state.guides.get(guideId);
  if (current === undefined) {
    throw new Error("Guía no encontrada.");
  }

  const next = updater(cloneGuideDetail(current));
  state.guides.set(guideId, next);
  const currentOrder = state.orders.get(next.orderId);
  if (currentOrder !== undefined) {
    state.orders.set(next.orderId, syncOrderProgress({ ...currentOrder, guide: next, dispatchGuideId: next.id, dispatchGuideNumber: next.number, dispatchStatus: next.status, deliveryStatus: next.delivery?.status ?? currentOrder.deliveryStatus, driverName: next.driverName ?? currentOrder.driverName, vehicleCode: next.vehicle ?? currentOrder.vehicleCode, deliveryZone: next.zoneName ?? currentOrder.deliveryZone, canViewGuide: true, expectedDate: next.scheduledDate ?? currentOrder.expectedDate, ...(next.delivery !== undefined ? { delivery: next.delivery } : {}) }));
  }
  return cloneGuideDetail(next);
}

export function getLogisticsCatalogs(): {
  readonly drivers: readonly DispatchDriver[];
  readonly vehicles: readonly DispatchVehicle[];
  readonly zones: readonly DispatchZone[];
} {
  return {
    drivers: state.drivers,
    vehicles: state.vehicles,
    zones: state.zones,
  };
}

export function getLogisticsOrderList(filters?: LogisticsFilters): readonly LogisticsOrderDetail[] {
  const rows = [...state.orders.values()];
  if (filters === undefined) {
    return rows.map((row) => cloneOrderDetail(row));
  }

  const normalized = filters.search.trim().toLowerCase();
  return rows
    .filter((row) => {
      const searchText = [
        row.order.number,
        row.clientName,
        row.tradeName ?? "",
        row.locality,
        row.sellerName ?? "",
        row.items.map((item) => item.description).join(" "),
        row.dispatchGuideNumber ?? "",
        row.driverName ?? "",
        row.vehicleCode ?? "",
      ].join(" ").toLowerCase();

      const matchesSearch = normalized.length === 0 || searchText.includes(normalized);
      const matchesStatus = filters.orderStatus === "all" || row.orderStatus === filters.orderStatus;
      const matchesPreparation = filters.preparationStatus === "all" || row.preparationStatus === filters.preparationStatus;
      const matchesDispatch = filters.dispatchStatus === "all" || row.dispatchStatus === filters.dispatchStatus;
      const matchesBranch = filters.branchId === "all" || row.branchId === filters.branchId;
      const matchesZone = filters.zoneId === "all" || row.deliveryZone === undefined || state.zones.find((zone) => zone.name === row.deliveryZone)?.id === filters.zoneId;
      const matchesDriver = filters.driverId === "all" || row.driverName === undefined || state.drivers.find((driver) => driver.name === row.driverName)?.id === filters.driverId;
      const matchesVehicle = filters.vehicleId === "all" || row.vehicleCode === undefined || state.vehicles.find((vehicle) => vehicle.code === row.vehicleCode)?.id === filters.vehicleId;
      const matchesMissing = filters.hasMissingItems === "all" || row.hasMissingItems === filters.hasMissingItems;
      const matchesNoGuide = filters.noGuide === "all" || (filters.noGuide ? row.dispatchGuideId === undefined : row.dispatchGuideId !== undefined);
      const matchesReady = filters.readyForDispatch === "all" || (filters.readyForDispatch ? row.orderStatus === "readyForDispatch" : true);
      const matchesPending = filters.deliveryPending === "all" || (filters.deliveryPending ? row.deliveryStatus === "pending" : true);
      const matchesFailed = filters.deliveryFailed === "all" || (filters.deliveryFailed ? row.deliveryStatus === "failed" : true);

      const lastUpdatedAt = row.guide?.updatedAt ?? row.order.updatedAt;
      const now = NOW.getTime();
      const updatedAt = new Date(lastUpdatedAt).getTime();
      const matchesDate = filters.dateRange === "all"
        || (filters.dateRange === "today" && now - updatedAt <= 24 * 60 * 60 * 1000)
        || (filters.dateRange === "last7Days" && now - updatedAt <= 7 * 24 * 60 * 60 * 1000)
        || (filters.dateRange === "last30Days" && now - updatedAt <= 30 * 24 * 60 * 60 * 1000);

      return matchesSearch && matchesStatus && matchesPreparation && matchesDispatch && matchesBranch && matchesZone && matchesDriver && matchesVehicle && matchesMissing && matchesNoGuide && matchesReady && matchesPending && matchesFailed && matchesDate;
    })
    .map((row) => cloneOrderDetail(row));
}

export function getLogisticsOrderDetail(orderId: OrderId): LogisticsOrderDetail | null {
  const detail = state.orders.get(orderId);
  return detail === undefined ? null : cloneOrderDetail(detail);
}

export function getLogisticsSummary(): LogisticsSummary {
  const rows = [...state.orders.values()];
  return {
    pendingPreparation: rows.filter((row) => row.orderStatus === "approved" && row.preparationStatus === "pending").length,
    preparing: rows.filter((row) => row.preparationStatus === "preparing").length,
    withMissingItems: rows.filter((row) => row.hasMissingItems).length,
    readyForDispatch: rows.filter((row) => row.orderStatus === "readyForDispatch").length,
    dispatchedToday: rows.filter((row) => row.orderStatus === "dispatched" || row.orderStatus === "delivered").length,
    pendingDeliveries: rows.filter((row) => row.deliveryStatus === "pending").length,
  };
}

export function getLogisticsHistory(orderId?: OrderId): readonly LogisticsHistoryEntry[] {
  if (orderId !== undefined) {
    return state.orders.get(orderId)?.history.map((entry) => cloneHistoryEntry(entry)) ?? [];
  }

  return [...state.orders.values()].flatMap((row) => row.history.map((entry) => cloneHistoryEntry(entry)));
}

export function startPreparation(orderId: OrderId): LogisticsOrderDetail {
  return setOrderDetail(orderId, (detail) => {
    if (detail.order.status !== "approved") {
      throw new Error("Solo los pedidos aprobados pueden iniciar preparación.");
    }

    const order: Order = { ...detail.order, status: "preparing", updatedAt: toIso(NOW) };
    return {
      ...detail,
      order,
      preparationStatus: "preparing",
      history: [...detail.history, createLogisticsHistoryEntry(order.id, "Preparación iniciada", "El pedido pasó a preparación operativa.", "preparing", order.updatedAt)],
    };
  });
}

export function updatePreparedQuantity(orderId: OrderId, itemId: string, preparedQuantity: number): LogisticsOrderDetail {
  return setOrderDetail(orderId, (detail) => {
    if (preparedQuantity < 0) {
      throw new Error("La cantidad preparada no puede ser negativa.");
    }

    const items = detail.items.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      if (preparedQuantity > item.requestedQuantity) {
        throw new Error("La cantidad preparada no puede superar la solicitada.");
      }

      const missingQuantity = item.requestedQuantity - preparedQuantity;
      const status: LogisticsPreparationItem["status"] = preparedQuantity === 0 ? "pending" : missingQuantity > 0 ? "partial" : "prepared";
      const nextItem: LogisticsPreparationItem = {
        ...item,
        preparedQuantity,
        missingQuantity,
        status,
      };

      return nextItem;
    });

    const missingItems = items
      .filter((item) => item.missingQuantity > 0)
      .map((item, index) => {
        const found = detail.missingItems.find((missing) => missing.productId === item.productId);
        if (found !== undefined) {
          return found;
        }

        const missingItem: LogisticsMissingItem = {
          id: `${orderId}-missing-${index + 1}`,
          productId: item.productId,
          productCode: item.code,
          productDescription: item.description,
          requestedQuantity: item.requestedQuantity,
          preparedQuantity: item.preparedQuantity,
          missingQuantity: item.missingQuantity,
          reason: "other",
          notes: "Faltante simulado registrado al ajustar cantidades.",
          reportedBy: REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1"),
          reportedAt: toIso(new Date()),
          resolutionStatus: "pending",
        };

        return missingItem;
      });

    const order: Order = { ...detail.order, status: detail.order.status === "approved" ? "preparing" : detail.order.status, updatedAt: toIso(NOW) };
    return {
      ...detail,
      order,
      items,
      missingItems,
      preparationStatus: getPreparationStatus(order.status, missingItems.length > 0),
      history: [...detail.history, createLogisticsHistoryEntry(order.id, "Cantidad preparada actualizada", `Se ajustó la cantidad del ítem ${itemId}.`, "preparing", order.updatedAt)],
    };
  });
}

export function registerMissingItem(orderId: OrderId, input: Omit<LogisticsMissingItem, "id" | "reportedAt">): LogisticsOrderDetail {
  return setOrderDetail(orderId, (detail) => {
    if (detail.order.status === "cancelled" || detail.order.status === "delivered") {
      throw new Error("No es posible registrar faltantes en este estado.");
    }

    const preparationItem = detail.items.find((item) => item.productId === input.productId);
    if (preparationItem === undefined) {
      throw new Error("No se pudo identificar el ítem afectado.");
    }

    if (input.missingQuantity <= 0) {
      throw new Error("La cantidad faltante debe ser mayor que cero.");
    }

    if (input.missingQuantity > preparationItem.missingQuantity) {
      throw new Error("La cantidad faltante no puede superar la pendiente.");
    }

    if (detail.missingItems.some((item) => item.productId === input.productId && item.resolutionStatus === "pending")) {
      throw new Error("Ya existe un faltante pendiente para este ítem.");
    }

    const missingItem: LogisticsMissingItem = {
      ...input,
      id: `${orderId}-missing-${Date.now()}`,
      reportedAt: toIso(new Date()),
    };

    return {
      ...detail,
      missingItems: [...detail.missingItems, missingItem],
      preparationStatus: detail.items.some((item) => item.missingQuantity > 0) || missingItem.missingQuantity > 0 ? "partial" : detail.preparationStatus,
      history: [...detail.history, createLogisticsHistoryEntry(orderId, "Faltante registrado", `Se registró un faltante para ${input.productCode} · ${input.productDescription}.`, "partial", missingItem.reportedAt)],
    };
  });
}

export function completePreparation(orderId: OrderId): LogisticsOrderDetail {
  return setOrderDetail(orderId, (detail) => {
    const hasPending = detail.items.some((item) => item.status === "pending");
    const unresolved = detail.missingItems.some((item) => item.resolutionStatus === "pending");
    if (hasPending || unresolved || detail.order.status === "cancelled" || detail.order.status === "dispatched" || detail.order.status === "delivered") {
      throw new Error("No es posible cerrar la preparación en el estado actual.");
    }

    const order: Order = { ...detail.order, status: "prepared", updatedAt: toIso(NOW) };
    return {
      ...detail,
      order,
      preparationStatus: "prepared",
      history: [...detail.history, createLogisticsHistoryEntry(order.id, "Pedido preparado", "La preparación se completó satisfactoriamente.", "prepared", order.updatedAt)],
    };
  });
}

export function markReadyForDispatch(orderId: OrderId): LogisticsOrderDetail {
  return setOrderDetail(orderId, (detail) => {
    if (detail.order.status !== "prepared") {
      throw new Error("El pedido debe estar preparado para pasar a despacho.");
    }

    const order: Order = { ...detail.order, status: "readyForDispatch", updatedAt: toIso(NOW) };
    return {
      ...detail,
      order,
      preparationStatus: "ready",
      dispatchStatus: "ready",
      history: [...detail.history, createLogisticsHistoryEntry(order.id, "Listo para despacho", "El pedido quedó habilitado para generar guía de despacho.", "ready", order.updatedAt)],
    };
  });
}

export function createDispatchGuide(orderId: OrderId, values?: Partial<DispatchGuideFormValues>): DispatchGuideDetail {
  const detail = state.orders.get(orderId);
  if (detail === undefined) {
    throw new Error("Pedido no encontrado.");
  }

  if (detail.order.status !== "prepared" && detail.order.status !== "readyForDispatch") {
    throw new Error("Solo se puede crear una guía a partir de un pedido preparado o listo para despacho.");
  }

  if (detail.guide !== undefined) {
    return cloneGuideDetail(detail.guide);
  }

  const driverId = values?.driverId?.trim() ?? "";
  const vehicleId = values?.vehicleId?.trim() ?? "";
  const zoneId = values?.zoneId?.trim() ?? "";
  const scheduledDate = values?.scheduledDate?.trim() ?? "";
  const scheduledTimeRange = values?.scheduledTimeRange?.trim() ?? "";
  const observations = values?.observations?.trim() ?? "";
  const driver = driverId.length > 0 ? state.drivers.find((item) => item.id === driverId) : state.drivers.find((item) => item.status === "available");
  const vehicle = vehicleId.length > 0 ? state.vehicles.find((item) => item.id === vehicleId) : state.vehicles.find((item) => item.status === "available");
  const zone = zoneId.length > 0 ? state.zones.find((item) => item.id === zoneId) : state.zones[0];
  const guideId = asId<DispatchGuideId>(`${orderId}-guide`);
  const now = toIso(new Date());
  const guideHistory = createDispatchGuideHistoryEntry(guideId, orderId, "Guía creada", "Se generó la guía de despacho a partir del pedido preparado.", "pending", now);
  const guide: DispatchGuideDetail = {
    id: guideId,
    companyId: detail.companyId,
    branchId: detail.branchId,
    orderId,
    number: createDispatchGuideNumber(state.nextGuideSequence++),
    clientId: detail.clientId,
    deliveryAddressId: detail.address.id,
    status: "pending",
    items: buildGuideItems(detail.order, detail.items),
    orderNumber: detail.orderNumber,
    clientName: detail.clientName,
    tradeName: detail.tradeName,
    locality: detail.locality,
    driverId: driver?.id,
    driverName: driver?.name,
    vehicleId: vehicle?.id,
    vehicleCode: vehicle?.code,
    vehicle: vehicle?.code,
    zoneId: zone?.id,
    zoneName: zone?.name,
    scheduledDate: scheduledDate.length > 0 ? scheduledDate : toIso(new Date(NOW.getTime() + 24 * 60 * 60 * 1000)),
    scheduledTimeRange: scheduledTimeRange.length > 0 ? scheduledTimeRange : undefined,
    deliveredAt: undefined,
    observations: observations.length > 0 ? observations : undefined,
    deliveryStatus: detail.deliveryStatus === "none" ? "pending" : detail.deliveryStatus,
    packageCount: Math.max(1, Math.ceil(detail.items.reduce((total, item) => total + item.preparedQuantity, 0) / 4)),
    totalWeight: Math.round(detail.items.reduce((total, item) => total + item.preparedQuantity * 1.8, 0) * 100) / 100,
    order: detail.order,
    client: detail.client,
    address: detail.address,
    delivery: undefined,
    createdAt: now,
    updatedAt: now,
    history: [guideHistory],
  };

  state.guides.set(guideId, guide);
  state.orders.set(orderId, {
    ...detail,
    guide,
    dispatchGuideId: guide.id,
    dispatchGuideNumber: guide.number,
    dispatchStatus: guide.status,
    expectedDate: guide.scheduledDate,
    driverName: guide.driverName,
    vehicleCode: guide.vehicle,
    deliveryZone: guide.zoneName,
    history: [...detail.history, createLogisticsHistoryEntry(orderId, "Guía de despacho generada", "El pedido quedó vinculado a una guía operativa.", "ready", now)],
  });

  return cloneGuideDetail(guide);
}

export function updateDispatchGuide(guideId: DispatchGuideId, values: Partial<DispatchGuideFormValues>): DispatchGuideDetail {
  const driverId = values.driverId?.trim() ?? "";
  const vehicleId = values.vehicleId?.trim() ?? "";
  const zoneId = values.zoneId?.trim() ?? "";
  const scheduledDate = values.scheduledDate?.trim() ?? "";
  const scheduledTimeRange = values.scheduledTimeRange?.trim() ?? "";
  const observations = values.observations?.trim() ?? "";

  return setGuideDetail(guideId, (guide) => ({
    ...guide,
    ...(driverId.length > 0 ? { driverId, driverName: state.drivers.find((driver) => driver.id === driverId)?.name } : {}),
    ...(vehicleId.length > 0 ? { vehicleId, vehicle: state.vehicles.find((vehicle) => vehicle.id === vehicleId)?.code } : {}),
    ...(zoneId.length > 0 ? { zoneId, zoneName: state.zones.find((zone) => zone.id === zoneId)?.name } : {}),
    ...(scheduledDate.length > 0 ? { scheduledDate } : {}),
    ...(scheduledTimeRange.length > 0 ? { scheduledTimeRange } : {}),
    ...(observations.length > 0 ? { observations } : {}),
    updatedAt: toIso(new Date()),
    history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Guía actualizada", "Se modificaron datos operativos de la guía.", guide.status, toIso(new Date()))],
  }));
}

export function assignDriver(guideId: DispatchGuideId, driverId: string): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const driver = state.drivers.find((item) => item.id === driverId);
    if (driver === undefined) {
      throw new Error("Repartidor no encontrado.");
    }

    const historyEntry: DispatchHistoryEntry = {
      id: `${guide.id}-history-${Date.now()}`,
      dispatchGuideId: guide.id,
      orderId: guide.orderId,
      date: toIso(new Date()),
      title: "Repartidor asignado",
      description: `Se asignó el repartidor ${driver.name}.`,
      status: guide.status === "pending" ? "assigned" : guide.status,
    };

    return {
      ...guide,
      driverId: driver.id,
      driverName: driver.name,
      status: guide.status === "pending" ? "assigned" : guide.status,
      updatedAt: toIso(new Date()),
    history: [...guide.history, historyEntry],
    };
  });
}

export function assignVehicle(guideId: DispatchGuideId, vehicleId: string): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (vehicle === undefined) {
      throw new Error("Vehículo no encontrado.");
    }

    const historyEntry: DispatchHistoryEntry = {
      id: `${guide.id}-history-${Date.now()}`,
      dispatchGuideId: guide.id,
      orderId: guide.orderId,
      date: toIso(new Date()),
      title: "Vehículo asignado",
      description: `Se asignó el vehículo ${vehicle.code}.`,
      status: guide.status === "pending" ? "assigned" : guide.status,
    };

    return {
      ...guide,
      vehicleId: vehicle.id,
      vehicle: vehicle.code,
      status: guide.status === "pending" ? "assigned" : guide.status,
      updatedAt: toIso(new Date()),
    history: [...guide.history, historyEntry],
    };
  });
}

export function scheduleDelivery(guideId: DispatchGuideId, values: Pick<DispatchGuideFormValues, "scheduledDate" | "scheduledTimeRange" | "observations">): DispatchGuideDetail {
  const observations = values.observations.trim();
  return setGuideDetail(guideId, (guide) => ({
    ...guide,
    scheduledDate: values.scheduledDate,
    scheduledTimeRange: values.scheduledTimeRange,
    observations: observations.length > 0 ? observations : guide.observations,
    updatedAt: toIso(new Date()),
    history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Programación actualizada", "Se actualizó la programación de entrega.", guide.status, toIso(new Date()))],
  }));
}

export function dispatchOrder(guideId: DispatchGuideId): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    if (guide.driverId === undefined || guide.vehicleId === undefined || guide.scheduledDate === undefined || guide.items.length === 0) {
      throw new Error("La guía no cumple las condiciones para despachar.");
    }

    const order = state.orders.get(guide.orderId);
    if (order === undefined) {
      throw new Error("Pedido no encontrado.");
    }

    const nextGuide = {
      ...guide,
      status: "dispatched" as const,
      updatedAt: toIso(new Date()),
    };
    const nextDelivery: Delivery = {
      id: `${guide.id}-delivery`,
      companyId: guide.companyId,
      branchId: guide.branchId,
      orderId: guide.orderId,
      dispatchGuideId: guide.id,
      status: "pending",
      createdBy: REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1"),
      createdAt: nextGuide.updatedAt,
      updatedAt: nextGuide.updatedAt,
      ...(guide.observations !== undefined ? { notes: guide.observations } : {}),
    };
    const updatedGuide: DispatchGuideDetail = { ...nextGuide, delivery: nextDelivery, history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Pedido despachado", "La guía fue enviada a reparto.", "dispatched", nextGuide.updatedAt)] };
    state.orders.set(guide.orderId, { ...order, order: { ...order.order, status: "dispatched", updatedAt: updatedGuide.updatedAt }, guide: updatedGuide, dispatchStatus: "dispatched", deliveryStatus: "pending", history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Pedido despachado", "El pedido pasó a reparto.", "dispatched", updatedGuide.updatedAt)] });
    state.guides.set(guide.id, updatedGuide);
    return updatedGuide;
  });
}

export function markDispatchGuideReady(guideId: DispatchGuideId): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    if (guide.status !== "preparing") {
      throw new Error("La guía debe estar en preparación para marcarla como lista.");
    }

    const order = state.orders.get(guide.orderId);
    if (order === undefined) {
      throw new Error("Pedido no encontrado.");
    }

    const now = toIso(new Date());
    const updatedGuide: DispatchGuideDetail = {
      ...guide,
      status: "ready" as const,
      updatedAt: now,
      history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Guía lista", "La guía quedó lista para despacho.", "ready", now)],
    };

    state.orders.set(guide.orderId, {
      ...order,
      order: { ...order.order, status: "readyForDispatch", updatedAt: now },
      guide: updatedGuide,
      dispatchStatus: "ready",
      history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Listo para despacho", "La guía quedó habilitada para salir.", "ready", now)],
    });
    state.guides.set(guide.id, updatedGuide);
    return updatedGuide;
  });
}

export function confirmDelivery(guideId: DispatchGuideId, values: DispatchDeliveryConfirmationValues): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const now = toIso(new Date());
    const nextDelivery: Delivery = {
      id: guide.delivery?.id ?? `${guide.id}-delivery`,
      companyId: guide.companyId,
      branchId: guide.branchId,
      orderId: guide.orderId,
      dispatchGuideId: guide.id,
      status: "delivered",
      recipientName: values.recipientName,
      ...(values.recipientDocument.trim().length > 0 ? { recipientDocument: values.recipientDocument.trim() } : {}),
      ...(values.notes.trim().length > 0 ? { notes: values.notes.trim() } : {}),
      createdBy: guide.delivery?.createdBy ?? (REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1")),
      createdAt: guide.delivery?.createdAt ?? now,
      updatedAt: now,
      proofOfDelivery: "placeholder://proof-of-delivery",
    };
    const updatedGuide: DispatchGuideDetail = { ...guide, status: "delivered" as const, deliveredAt: now, delivery: nextDelivery, updatedAt: now, history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Entrega confirmada", `Recepción: ${values.recipientName}.`, "delivered", now)] };
    const order = state.orders.get(guide.orderId);
    if (order !== undefined) {
      state.orders.set(guide.orderId, { ...order, order: { ...order.order, status: "delivered", updatedAt: now }, guide: updatedGuide, deliveryStatus: "delivered", history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Entrega confirmada", "La entrega fue confirmada desde logística.", "delivered", now)] });
    }
    return updatedGuide;
  });
}

export function markDeliveryFailed(guideId: DispatchGuideId, values: DispatchDeliveryFailureValues): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const now = toIso(new Date());
    const nextDelivery: Delivery = {
      id: guide.delivery?.id ?? `${guide.id}-delivery`,
      companyId: guide.companyId,
      branchId: guide.branchId,
      orderId: guide.orderId,
      dispatchGuideId: guide.id,
      status: "failed",
      failureReason: values.reason,
      ...(values.notes.trim().length > 0 ? { notes: values.notes.trim() } : {}),
      createdBy: guide.delivery?.createdBy ?? (REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1")),
      createdAt: guide.delivery?.createdAt ?? now,
      updatedAt: now,
    };
    const updatedGuide: DispatchGuideDetail = { ...guide, status: "failed" as const, delivery: nextDelivery, updatedAt: now, history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Entrega fallida", "La entrega fue marcada como fallida.", "failed", now)] };
    const order = state.orders.get(guide.orderId);
    if (order !== undefined) {
      state.orders.set(guide.orderId, { ...order, order: { ...order.order, status: "dispatched", updatedAt: now }, guide: updatedGuide, deliveryStatus: "failed", history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Entrega fallida", "La entrega quedó pendiente de reprogramación.", "failed", now)] });
    }
    return updatedGuide;
  });
}

export function rescheduleDelivery(guideId: DispatchGuideId, values: DispatchDeliveryRescheduleValues): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const now = toIso(new Date());
    const nextDelivery: Delivery = {
      id: guide.delivery?.id ?? `${guide.id}-delivery`,
      companyId: guide.companyId,
      branchId: guide.branchId,
      orderId: guide.orderId,
      dispatchGuideId: guide.id,
      status: "rescheduled",
      rescheduledDate: values.rescheduledDate,
      ...(values.notes.trim().length > 0 ? { notes: values.notes.trim() } : {}),
      createdBy: guide.delivery?.createdBy ?? (REQUESTED_BY_USERS[0] ?? asId<UserId>("user-logistics-1")),
      createdAt: guide.delivery?.createdAt ?? now,
      updatedAt: now,
    };
    const updatedGuide: DispatchGuideDetail = { ...guide, status: "rescheduled" as const, delivery: nextDelivery, updatedAt: now, scheduledDate: values.rescheduledDate, history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Entrega reprogramada", "Se reprogramó la entrega del pedido.", "rescheduled", now)] };
    const order = state.orders.get(guide.orderId);
    if (order !== undefined) {
      state.orders.set(guide.orderId, { ...order, guide: updatedGuide, deliveryStatus: "rescheduled", history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Entrega reprogramada", "La entrega fue reprogramada desde logística.", "rescheduled", now)] });
    }
    return updatedGuide;
  });
}

export function cancelDispatch(guideId: DispatchGuideId, reason = "Cancelado manualmente."): DispatchGuideDetail {
  return setGuideDetail(guideId, (guide) => {
    const now = toIso(new Date());
    const updatedGuide: DispatchGuideDetail = { ...guide, status: "cancelled" as const, updatedAt: now, observations: guide.observations ?? reason, history: [...guide.history, createDispatchGuideHistoryEntry(guide.id, guide.orderId, "Despacho cancelado", reason, "cancelled", now)] };
    const order = state.orders.get(guide.orderId);
    if (order !== undefined) {
      state.orders.set(guide.orderId, { ...order, guide: updatedGuide, dispatchStatus: "cancelled", history: [...order.history, createLogisticsHistoryEntry(guide.orderId, "Despacho cancelado", "La guía fue cancelada.", "cancelled", now)] });
    }
    return updatedGuide;
  });
}

export function getDispatchGuideList(): readonly DispatchGuideDetail[] {
  return [...state.guides.values()].map((guide) => cloneGuideDetail(guide));
}

export function getDispatchGuideDetail(guideId: DispatchGuideId): DispatchGuideDetail | null {
  const guide = state.guides.get(guideId);
  return guide === undefined ? null : cloneGuideDetail(guide);
}

export function getDispatchGuideByOrderId(orderId: OrderId): DispatchGuideDetail | null {
  const detail = state.orders.get(orderId);
  return detail?.guide === undefined ? null : cloneGuideDetail(detail.guide);
}

export function getDispatchSummary(): LogisticsSummary {
  return {
    pendingPreparation: state.orders.size ? [...state.orders.values()].filter((row) => row.orderStatus === "approved" && row.preparationStatus === "pending").length : 0,
    preparing: [...state.orders.values()].filter((row) => row.preparationStatus === "preparing").length,
    withMissingItems: [...state.orders.values()].filter((row) => row.hasMissingItems).length,
    readyForDispatch: [...state.orders.values()].filter((row) => row.orderStatus === "readyForDispatch").length,
    dispatchedToday: [...state.orders.values()].filter((row) => row.orderStatus === "dispatched" || row.orderStatus === "delivered").length,
    pendingDeliveries: [...state.orders.values()].filter((row) => row.deliveryStatus === "pending").length,
  };
}

export function getDispatchReferenceData() {
  return {
    driverOptions: state.drivers.map((driver) => ({ id: driver.id, label: driver.name })),
    vehicleOptions: state.vehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.code} · ${vehicle.plate}` })),
    zoneOptions: state.zones.map((zone) => ({ id: zone.id, label: zone.name })),
    deliveryStatusOptions: [
      { id: "all", label: "Todas" },
      { id: "pending", label: "Pendiente" },
      { id: "delivered", label: "Entregada" },
      { id: "failed", label: "Fallida" },
      { id: "rescheduled", label: "Reprogramada" },
    ] as const,
    dispatchStatusOptions: [
      { id: "all", label: "Todos" },
      { id: "pending", label: "Pendiente" },
      { id: "assigned", label: "Asignada" },
      { id: "preparing", label: "En preparación" },
      { id: "ready", label: "Lista" },
      { id: "dispatched", label: "Despachada" },
      { id: "delivered", label: "Entregada" },
      { id: "failed", label: "Fallida" },
      { id: "rescheduled", label: "Reprogramada" },
      { id: "cancelled", label: "Cancelada" },
    ] as const,
  };
}
