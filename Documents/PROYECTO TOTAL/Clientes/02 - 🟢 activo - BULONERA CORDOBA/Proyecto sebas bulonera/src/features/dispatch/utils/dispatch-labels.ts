import type { DeliveryFailureReason, DeliveryStatus } from "@/domain/dispatch/delivery";
import type { DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";

export function getDispatchGuideStatusLabel(status: DispatchGuideStatus): string {
  const labels: Record<DispatchGuideStatus, string> = {
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

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    pending: "Pendiente",
    delivered: "Entregada",
    failed: "Fallida",
    rescheduled: "Reprogramada",
  };

  return labels[status];
}

export function getDeliveryFailureReasonLabel(reason: DeliveryFailureReason): string {
  const labels: Record<DeliveryFailureReason, string> = {
    clientAbsent: "Cliente ausente",
    incorrectAddress: "Dirección incorrecta",
    rejectedDelivery: "Entrega rechazada",
    vehicleIssue: "Problema del vehículo",
    damagedGoods: "Mercadería dañada",
    other: "Otro motivo",
  };

  return labels[reason];
}

