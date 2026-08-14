import type { DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import type { DeliveryStatus } from "@/domain/dispatch/delivery";
import type { OrderStatus } from "@/domain/order/order";
import type { MissingItemReason, MissingItemResolutionStatus, PreparationStatus } from "../types";

export function getPreparationStatusLabel(status: PreparationStatus): string {
  const labels: Record<PreparationStatus, string> = {
    pending: "Pendiente",
    preparing: "En preparación",
    partial: "Parcial",
    prepared: "Preparado",
    ready: "Listo para despacho",
  };

  return labels[status];
}

export function getLogisticsOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: "Borrador",
    pendingApproval: "Pendiente de aprobación",
    approved: "Aprobado",
    preparing: "En preparación",
    prepared: "Preparado",
    readyForDispatch: "Listo para despacho",
    dispatched: "Despachado",
    delivered: "Entregado",
    sentToTango: "Enviado a Tango",
    invoiced: "Facturado",
    cancelled: "Cancelado",
  };

  return labels[status];
}

export function getDispatchGuideStatusLabel(status: DispatchGuideStatus | "none"): string {
  const labels: Record<DispatchGuideStatus | "none", string> = {
    none: "Sin guía",
    pending: "Pendiente",
    assigned: "Asignada",
    preparing: "En preparación",
    ready: "Lista",
    dispatched: "Despachada",
    delivered: "Entregada",
    failed: "Fallida",
    rescheduled: "Reprogramada",
    cancelled: "Cancelada",
  };

  return labels[status];
}

export function getDeliveryStatusLabel(status: DeliveryStatus | "none"): string {
  const labels: Record<DeliveryStatus | "none", string> = {
    none: "Sin entrega",
    pending: "Pendiente",
    delivered: "Entregada",
    failed: "Fallida",
    rescheduled: "Reprogramada",
  };

  return labels[status];
}

export function getMissingItemReasonLabel(reason: MissingItemReason): string {
  const labels: Record<MissingItemReason, string> = {
    outOfStock: "Sin stock",
    damaged: "Mercadería dañada",
    incorrectProduct: "Producto incorrecto",
    locationNotFound: "Ubicación no encontrada",
    pendingReplenishment: "Reposición pendiente",
    other: "Otro motivo",
  };

  return labels[reason];
}

export function getMissingItemResolutionLabel(status: MissingItemResolutionStatus): string {
  const labels: Record<MissingItemResolutionStatus, string> = {
    pending: "Pendiente",
    accepted: "Aceptado",
    replaced: "Reemplazado",
    cancelled: "Cancelado",
    resolved: "Resuelto",
  };

  return labels[status];
}

