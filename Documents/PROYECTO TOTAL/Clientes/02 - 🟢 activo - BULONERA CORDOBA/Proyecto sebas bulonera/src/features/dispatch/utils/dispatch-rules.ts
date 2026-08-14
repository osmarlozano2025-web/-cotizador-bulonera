import type { DispatchGuide } from "@/domain/dispatch/dispatch-guide";
import { canTransitionDispatchGuideStatus } from "@/domain/shared/state-transitions";
import { getDispatchGuideStatusLabel } from "./dispatch-labels";
import type { DispatchGuideDetail, DispatchGuideFormValues } from "../types";

export function createDispatchGuideNumber(sequence: number, year = new Date().getFullYear()): string {
  return `GD-${year}-${String(sequence).padStart(4, "0")}`;
}

export function validateDispatchGuideForm(values: DispatchGuideFormValues): string[] {
  const issues: string[] = [];

  if (values.driverId.trim().length === 0) {
    issues.push("El repartidor es obligatorio.");
  }

  if (values.vehicleId.trim().length === 0) {
    issues.push("El vehículo es obligatorio.");
  }

  if (values.zoneId.trim().length === 0) {
    issues.push("La zona de entrega es obligatoria.");
  }

  if (values.scheduledDate.trim().length === 0) {
    issues.push("La fecha de entrega es obligatoria.");
  }

  if (values.scheduledTimeRange.trim().length === 0) {
    issues.push("La franja horaria es obligatoria.");
  }

  if (values.observations.trim().length === 0) {
    issues.push("Las observaciones son obligatorias.");
  }

  return issues;
}

export function canCreateGuideFromDetail(detail: Pick<DispatchGuideDetail, "order" | "status">): boolean {
  return detail.order.status === "prepared" || detail.order.status === "readyForDispatch";
}

export function canUpdateGuide(guide: Pick<DispatchGuide, "status">): boolean {
  return guide.status !== "delivered" && guide.status !== "cancelled";
}

export function canMarkDispatchGuideReady(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "ready");
}

export function canDispatchDispatchGuide(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "dispatched");
}

export function canConfirmDispatchDelivery(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "delivered");
}

export function canRegisterDispatchFailure(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "failed");
}

export function canRescheduleDispatchDelivery(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "rescheduled");
}

export function canCancelDispatchGuide(guide: Pick<DispatchGuide, "status">): boolean {
  return canTransitionDispatchGuideStatus(guide.status, "cancelled");
}

export function assertDispatchGuideTransition(guide: Pick<DispatchGuide, "status">, nextStatus: DispatchGuide["status"]): void {
  if (!canTransitionDispatchGuideStatus(guide.status, nextStatus)) {
    throw new Error(`No se puede pasar la guía de ${getDispatchGuideStatusLabel(guide.status)} a ${getDispatchGuideStatusLabel(nextStatus)}.`);
  }
}
