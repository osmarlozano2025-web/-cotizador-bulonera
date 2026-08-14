import type { QuoteStatus } from "@/domain/quote/quote";

export function getQuoteStatusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    draft: "Borrador",
    pendingApproval: "Pendiente de aprobación",
    sent: "Enviada",
    accepted: "Aceptada",
    rejected: "Rechazada",
    expired: "Vencida",
    converted: "Convertida",
    cancelled: "Cancelada",
  };

  return labels[status];
}

export function getQuoteStatusTone(status: QuoteStatus): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "accepted":
    case "converted":
      return "success";
    case "pendingApproval":
    case "sent":
    case "draft":
      return "info";
    case "expired":
    case "rejected":
    case "cancelled":
      return "danger";
  }
}

export function getQuoteQuickFilterLabel(filter: "all" | "expired" | "accepted" | "pending"): string {
  const labels: Record<"all" | "expired" | "accepted" | "pending", string> = {
    all: "Todas",
    expired: "Vencidas",
    accepted: "Aceptadas",
    pending: "Pendientes",
  };

  return labels[filter];
}
