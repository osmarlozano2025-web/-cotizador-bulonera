export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string): string {
  if (value === undefined) {
    return "Sin dato";
  }

  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value?: string): string {
  if (value === undefined) {
    return "Sin dato";
  }

  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatCommercialDateTime(value?: string): string {
  if (value === undefined) {
    return "Sin dato";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercentage(value?: number): string {
  if (value === undefined) {
    return "—";
  }

  return `${value}%`;
}
