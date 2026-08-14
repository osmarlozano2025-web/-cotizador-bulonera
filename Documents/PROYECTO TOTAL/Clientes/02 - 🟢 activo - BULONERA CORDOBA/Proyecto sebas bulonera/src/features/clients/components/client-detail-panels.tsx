import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientAccountMovement, ClientDetailData } from "../types";
import { formatCurrency, formatDate, formatDateTime, formatPercentage } from "../utils/formatters";
import { ClientAccountStatusBadge, ClientCommercialStatusBadge, ClientStatusBadge } from "./client-status-badge";
import { calculateAvailableCredit, getAccountStatusLabel } from "../utils/client-calculations";

interface ClientDetailPanelsProps {
  readonly detail: ClientDetailData;
}

function SummaryCard({
  title,
  value,
  description,
}: {
  readonly title: string;
  readonly value: string;
  readonly description?: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function MovementRow({ movement }: { readonly movement: ClientAccountMovement }): React.JSX.Element {
  const movementLabels: Record<ClientAccountMovement["type"], string> = {
    invoice: "Factura",
    payment: "Pago",
    creditNote: "Nota de crédito",
    pendingBalance: "Saldo pendiente",
  };

  return (
    <tr className="border-b">
      <td className="px-4 py-3">{formatDate(movement.date)}</td>
      <td className="px-4 py-3 font-medium">{movementLabels[movement.type]}</td>
      <td className="px-4 py-3">{movement.reference}</td>
      <td className="px-4 py-3">{formatCurrency(movement.amount)}</td>
      <td className="px-4 py-3">{formatCurrency(movement.balance)}</td>
    </tr>
  );
}

export function ClientSummaryPanels({ detail }: ClientDetailPanelsProps): React.JSX.Element {
  const { client, accountSummary } = detail;
  const creditAvailable = calculateAvailableCredit(client.creditLimit.amount, client.currentDebt.amount);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Deuda total" value={formatCurrency(accountSummary.debtTotal)} />
        <SummaryCard title="Deuda vencida" value={formatCurrency(accountSummary.overdueDebt)} />
        <SummaryCard title="Límite de crédito" value={formatCurrency(accountSummary.creditLimit)} />
        <SummaryCard title="Crédito disponible" value={formatCurrency(creditAvailable)} />
        <SummaryCard title="Descuento general" value={formatPercentage(client.generalDiscountPercentage)} />
        <SummaryCard title="Pedidos" value={String(accountSummary.ordersCount)} />
        <SummaryCard title="Última compra" value={formatDate(accountSummary.lastPurchaseAt)} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ClientStatusBadge status={client.status} />
            <ClientCommercialStatusBadge status={client.commercialStatus} />
            <ClientAccountStatusBadge status={accountSummary.accountStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Información comercial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p>
              <p className="mt-1 font-medium">{detail.assignedSellerName ?? "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lista de precios</p>
              <p className="mt-1 font-medium">{detail.priceListName ?? "Sin lista"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Condición de pago</p>
              <p className="mt-1 font-medium">{client.paymentCondition}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contacto</p>
              <p className="mt-1 font-medium">{client.contactName ?? "Sin contacto"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Observaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">{client.notes ?? "Sin observaciones"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de cuenta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p><span className="text-muted-foreground">Días de mora:</span> {accountSummary.daysPastDue}</p>
            <p><span className="text-muted-foreground">Última actualización:</span> {formatDateTime(accountSummary.lastUpdatedAt)}</p>
            <p><span className="text-muted-foreground">Autorización:</span> {accountSummary.needsAuthorization ? "Requerida" : "No requerida"}</p>
            <p><span className="text-muted-foreground">Disponible:</span> {formatCurrency(accountSummary.creditAvailable)}</p>
            {accountSummary.needsAuthorization && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                La cuenta necesita autorización comercial antes de operar normalmente.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta corriente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="mt-1 font-medium">{getAccountStatusLabel(accountSummary.accountStatus)}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Crédito disponible</p>
              <p className="mt-1 font-medium">{formatCurrency(accountSummary.creditAvailable)}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Última compra</p>
              <p className="mt-1 font-medium">{formatDate(accountSummary.lastPurchaseAt)}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Autorización</p>
              <p className="mt-1 font-medium">{accountSummary.needsAuthorization ? "Requerida" : "No requerida"}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {detail.accountMovements.map((movement) => (
                  <MovementRow key={movement.id} movement={movement} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Direcciones</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {detail.addresses.map((address) => (
              <div key={address.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{address.street} {address.number ?? ""}</p>
                  {address.isDefault && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Principal</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.province}, {address.country}
                </p>
                <p className="text-sm text-muted-foreground">{address.reference ?? "Sin referencias"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descuentos especiales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">General</p>
              <p className="text-muted-foreground">{formatPercentage(client.generalDiscountPercentage)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Por familia</p>
              <p className="text-muted-foreground">Simulado para futuras reglas de negocio.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Por línea</p>
              <p className="text-muted-foreground">Simulado para futuras reglas de negocio.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Por producto</p>
              <p className="text-muted-foreground">Simulado para futuras reglas de negocio.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ClientRelatedSection({
  title,
  description,
  emptyMessage,
  items,
}: {
  readonly title: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly items: readonly { id: string; number: string; status: string; amount: number; date: string }[];
}): React.JSX.Element {
  const statusLabels: Record<string, string> = {
    draft: "Borrador",
    pendingApproval: "Pendiente de aprobación",
    sent: "Enviada",
    accepted: "Aceptada",
    rejected: "Rechazada",
    expired: "Vencida",
    converted: "Convertida",
    cancelled: "Cancelada",
    approved: "Aprobada",
    preparing: "Preparando",
    prepared: "Preparada",
    readyForDispatch: "Lista para despacho",
    dispatched: "Despachada",
    delivered: "Entregada",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.number}</p>
                  <span className="text-xs text-muted-foreground">{statusLabels[item.status] ?? item.status}</span>
                </div>
                <p className="text-muted-foreground">{formatDate(item.date)}</p>
                <p className="mt-1 font-medium">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
