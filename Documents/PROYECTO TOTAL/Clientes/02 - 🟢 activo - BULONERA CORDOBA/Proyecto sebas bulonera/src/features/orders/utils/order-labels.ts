import type { OrderStatus } from "@/domain/order/order";
import type { OrderDispatchStatus, OrderTangoStatus } from "../types";

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: "Borrador",
    pendingApproval: "Pendiente de aprobación",
    approved: "Aprobado",
    preparing: "Preparando",
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

export function getOrderStatusTone(status: OrderStatus): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "approved":
    case "prepared":
    case "readyForDispatch":
    case "delivered":
    case "invoiced":
      return "success";
    case "pendingApproval":
    case "preparing":
    case "sentToTango":
      return "warning";
    case "cancelled":
      return "danger";
    case "draft":
    case "dispatched":
      return "info";
  }
}

export function getDispatchStatusLabel(status: OrderDispatchStatus): string {
  const labels: Record<OrderDispatchStatus, string> = {
    pending: "Pendiente",
    preparing: "Preparando",
    prepared: "Preparado",
    ready: "Listo",
    dispatched: "Despachado",
  };
  return labels[status];
}

export function getTangoStatusLabel(status: OrderTangoStatus): string {
  const labels: Record<OrderTangoStatus, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    sent: "Enviado",
    error: "Error",
  };
  return labels[status];
}
