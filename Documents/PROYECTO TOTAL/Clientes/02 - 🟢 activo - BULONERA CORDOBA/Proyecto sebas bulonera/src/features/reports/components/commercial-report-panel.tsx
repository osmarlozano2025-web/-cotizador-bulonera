import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/common/dashboard-card";
import { formatCommercialDateTime } from "@/features/clients/utils/formatters";
import type {
  CommercialClientRankingRow,
  CommercialOperationRow,
  CommercialReportModel,
  CommercialSellerRankingRow,
  CommercialSummaryCard,
} from "../types";

const SUMMARY_TONE_CLASS_NAMES: Record<CommercialSummaryCard["tone"], string> = {
  primary: "bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-800",
  success: "bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
  warning: "bg-amber-100 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
  danger: "bg-rose-100 text-rose-700 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900",
  muted: "bg-muted text-muted-foreground ring-border",
};

const ROW_TONE_CLASS_NAMES: Record<"success" | "warning" | "danger" | "primary" | "muted", string> = {
  primary: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  muted: "border-border bg-muted text-muted-foreground",
};

function statusTone(label: string): keyof typeof ROW_TONE_CLASS_NAMES {
  if (label.includes("Entregado") || label.includes("Aprobado") || label.includes("Convertida")) {
    return "success";
  }

  if (label.includes("Pendiente") || label.includes("Preparando") || label.includes("Enviada") || label.includes("Listo")) {
    return "warning";
  }

  if (label.includes("Cancelado") || label.includes("Rechazado") || label.includes("Fallido")) {
    return "danger";
  }

  if (label.includes("Borrador")) {
    return "muted";
  }

  return "primary";
}

function ToneBadge({ label, tone }: { readonly label: string; readonly tone: keyof typeof ROW_TONE_CLASS_NAMES }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${ROW_TONE_CLASS_NAMES[tone]}`}>
      {label}
    </span>
  );
}

function SummaryCard({ card }: { readonly card: CommercialSummaryCard }): React.JSX.Element {
  return (
    <DashboardCard
      title={card.title}
      icon={(
        <span className={`grid size-10 place-items-center rounded-full ring-1 ${SUMMARY_TONE_CLASS_NAMES[card.tone]}`}>
          <card.icon className="size-5" />
        </span>
      )}
    >
      <div className="grid gap-1">
        <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
        <p className="text-sm text-muted-foreground">{card.description}</p>
        {card.note && <p className="text-xs font-medium text-muted-foreground">{card.note}</p>}
      </div>
    </DashboardCard>
  );
}

function ClientRankingTable({ rows }: { readonly rows: readonly CommercialClientRankingRow[] }): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Ranking de clientes</CardTitle>
        <p className="text-sm text-muted-foreground">Clientes con mayor facturación del período.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Ticket prom.</th>
                <th className="px-4 py-3">Última operación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length > 0 ? rows.map((row) => (
                <tr key={row.clientId} className="align-top">
                  <td className="px-4 py-4 font-medium">{row.position}</td>
                  <td className="px-4 py-4">
                    <Link className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to={row.to ?? `/clients/${row.clientId}`}>
                      {row.clientName}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </td>
                  <td className="px-4 py-4">{row.ordersCount}</td>
                  <td className="px-4 py-4 font-medium">{row.totalLabel}</td>
                  <td className="px-4 py-4">{row.averageTicketLabel}</td>
                  <td className="px-4 py-4">
                    <div className="grid gap-0.5">
                      <span>{row.lastOperationLabel}</span>
                      <span className="text-xs text-muted-foreground">{row.lastOperationDate}</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={6}>
                    No hay clientes para mostrar con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SellerRankingTable({ rows }: { readonly rows: readonly CommercialSellerRankingRow[] }): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Ranking de vendedores</CardTitle>
        <p className="text-sm text-muted-foreground">Actividad comercial por vendedor.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Cotizaciones aprobadas</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length > 0 ? rows.map((row) => (
                <tr key={row.sellerId} className="align-top">
                  <td className="px-4 py-4 font-medium">{row.position}</td>
                  <td className="px-4 py-4">{row.sellerName}</td>
                  <td className="px-4 py-4">{row.ordersCount}</td>
                  <td className="px-4 py-4">{row.approvedQuotesCount}</td>
                  <td className="px-4 py-4 font-medium">{row.totalLabel}</td>
                  <td className="px-4 py-4">{row.conversionRateLabel}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={6}>
                    No hay vendedores para mostrar con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EvolutionPanel({ model }: { readonly model: CommercialReportModel }): React.JSX.Element {
  const maxRatio = Math.max(...model.evolution.map((point) => point.ratio), 0);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Evolución del período</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ventas agrupadas por {model.granularity === "day" ? "día" : model.granularity === "week" ? "semana" : "mes"}.
        </p>
      </CardHeader>
      <CardContent>
        {model.evolution.length > 0 ? (
          <div className="grid gap-3">
            {model.evolution.map((point) => (
              <div key={point.label} className="grid gap-2 rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{point.label}</p>
                    <p className="text-xs text-muted-foreground">{point.ordersCount} pedidos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{point.totalLabel}</p>
                    <p className="text-xs text-muted-foreground">{point.ratio}% del máximo</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-[width]"
                    style={{ width: `${maxRatio === 0 ? 0 : Math.max(8, point.ratio)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay ventas para mostrar con los filtros actuales.</p>
        )}
      </CardContent>
    </Card>
  );
}

function OperationsTable({ rows }: { readonly rows: readonly CommercialOperationRow[] }): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Operaciones comerciales</CardTitle>
        <p className="text-sm text-muted-foreground">Detalle de pedidos y su origen comercial.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length > 0 ? rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">{formatCommercialDateTime(row.date)}</td>
                  <td className="px-4 py-4">
                    <Link className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to={row.orderTo ?? `/orders/${row.id}`}>
                      {row.orderNumber}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <Link className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to={row.clientTo ?? "/clients"}>
                      {row.clientName}
                      <UserRound className="size-3.5" />
                    </Link>
                  </td>
                  <td className="px-4 py-4">{row.sellerName}</td>
                  <td className="px-4 py-4">
                    <ToneBadge label={row.statusLabel} tone={statusTone(row.statusLabel)} />
                  </td>
                  <td className="px-4 py-4 font-medium">{row.totalLabel}</td>
                  <td className="px-4 py-4">
                    {row.quoteTo ? (
                      <Link className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to={row.quoteTo}>
                        {row.originLabel}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    ) : (
                      <span>{row.originLabel}</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                    No hay operaciones comerciales para mostrar con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommercialReportPanel({ model }: { readonly model: CommercialReportModel }): React.JSX.Element {
  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Comercial</CardTitle>
          <p className="text-sm text-muted-foreground">
            {model.periodLabel} · análisis de ventas, clientes, vendedores y operaciones.
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {model.summaryCards.map((card) => <SummaryCard key={card.title} card={card} />)}
      </section>

      <EvolutionPanel model={model} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ClientRankingTable rows={model.clientRanking} />
        <SellerRankingTable rows={model.sellerRanking} />
      </div>

      <OperationsTable rows={model.operations} />
    </section>
  );
}
