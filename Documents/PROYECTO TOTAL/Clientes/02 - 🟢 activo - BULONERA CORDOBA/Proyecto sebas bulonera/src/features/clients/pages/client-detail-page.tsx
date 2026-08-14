import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ClientRelatedSection, ClientSummaryPanels } from "../components/client-detail-panels";
import { ClientCommercialStatusBadge, ClientStatusBadge } from "../components/client-status-badge";
import { mutateClientStatus, useClientDetail } from "../hooks/use-clients";
import { getAccountStatusLabel } from "../utils/client-calculations";
import { formatCurrency, formatDate } from "../utils/formatters";
import type { ClientId } from "@/domain/shared";

const TABS = ["summary", "commercial", "account", "addresses", "quotes", "orders", "activity"] as const;
type DetailTab = (typeof TABS)[number];

export function ClientDetailPage(): React.JSX.Element {
  const { clientId: clientIdParam } = useParams();
  const clientId = clientIdParam as ClientId | undefined;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { detail, loading, error, refresh, capabilities } = useClientDetail(clientId);
  const [authorizationRequested, setAuthorizationRequested] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() => {
    const state = location.state as { flashMessage?: string } | null;
    return typeof state?.flashMessage === "string" ? state.flashMessage : null;
  });
  const activeTab = useMemo<DetailTab>(() => {
    const tab = searchParams.get("tab");
    return TABS.includes(tab as DetailTab) ? (tab as DetailTab) : "summary";
  }, [searchParams]);

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando cliente...</CardContent></Card>;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el cliente" description={error} />;
  }

  if (detail === null) {
    return <EmptyState title="Cliente no encontrado" description="El registro solicitado no está disponible en la carga simulada." />;
  }

  const relatedDocuments = {
    quotes: detail.quotes,
    orders: detail.orders,
  };
  const accountMovements = detail.accountMovements;
  const activity = detail.activity;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={detail.client.legalName}
        description={`${detail.client.code} · ${detail.client.taxId}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/clients">Volver</Link>
            </Button>
            {capabilities.canEdit && (
              <Button asChild>
                <Link to={`/clients/${detail.client.id}/edit`}>Editar</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/accounts/${detail.client.id}`}>Cuenta corriente</Link>
            </Button>
            {capabilities.canChangeStatus && (
              <Button
                variant="outline"
                onClick={() => {
                  void mutateClientStatus(detail.client.id, detail.client.status === "blocked" ? "active" : "blocked").then(() => {
                    setFeedback("Estado actualizado correctamente.");
                    return refresh();
                  });
                }}
              >
                Cambiar estado
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ClientStatusBadge status={detail.client.status} />
        <ClientCommercialStatusBadge status={detail.client.commercialStatus} />
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{detail.client.taxId}</span>
      </div>

      {feedback && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 text-sm text-sky-800">{feedback}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set("tab", tab);
              setSearchParams(nextParams);
            }}
          >
            {tab === "summary" && "Resumen"}
            {tab === "commercial" && "Información comercial"}
            {tab === "account" && "Cuenta corriente"}
            {tab === "addresses" && "Direcciones"}
            {tab === "quotes" && "Cotizaciones"}
            {tab === "orders" && "Pedidos"}
            {tab === "activity" && "Actividad"}
          </Button>
        ))}
      </div>

      {activeTab === "summary" && <ClientSummaryPanels detail={detail} />}

      {activeTab === "commercial" && (
        <Card>
          <CardHeader>
            <CardTitle>Información comercial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor asignado</p>
              <p className="mt-1 font-medium">{detail.assignedSellerName ?? "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lista de precios</p>
              <p className="mt-1 font-medium">{detail.priceListName ?? "Sin lista"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Descuento general</p>
              <p className="mt-1 font-medium">{detail.client.generalDiscountPercentage ?? 0}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Condición de pago</p>
              <p className="mt-1 font-medium">{detail.client.paymentCondition}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Observaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">{detail.client.notes ?? "Sin observaciones"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "account" && (
        <Card>
          <CardHeader>
            <CardTitle>Cuenta corriente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Deuda total</p>
                <p className="mt-1 font-medium">{formatCurrency(detail.accountSummary.debtTotal)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Deuda vencida</p>
                <p className="mt-1 font-medium">{formatCurrency(detail.accountSummary.overdueDebt)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Límite de crédito</p>
                <p className="mt-1 font-medium">{formatCurrency(detail.accountSummary.creditLimit)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Disponible</p>
                <p className="mt-1 font-medium">{formatCurrency(detail.accountSummary.creditAvailable)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Estado</p>
                <p className="mt-1 font-medium">{getAccountStatusLabel(detail.accountSummary.accountStatus)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Días de mora</p>
                <p className="mt-1 font-medium">{detail.accountSummary.daysPastDue}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Última actualización</p>
                <p className="mt-1 font-medium">{formatDate(detail.accountSummary.lastUpdatedAt)}</p>
              </div>
            </div>

            {detail.accountSummary.needsAuthorization && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <p>Esta cuenta requiere autorización antes de operar normalmente.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuthorizationRequested(true)}
                >
                  Solicitar autorización
                </Button>
              </div>
            )}

            {authorizationRequested && (
              <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                Solicitud simulada generada. Cuando el flujo real de autorizaciones esté conectado, este punto enviará la gestión correspondiente.
              </div>
            )}

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
                  {accountMovements.map((movement) => (
                    <tr key={movement.id} className="border-b">
                      <td className="px-4 py-3">{formatDate(movement.date)}</td>
                      <td className="px-4 py-3">
                        {movement.type === "invoice" && "Factura"}
                        {movement.type === "payment" && "Pago"}
                        {movement.type === "creditNote" && "Nota de crédito"}
                        {movement.type === "pendingBalance" && "Saldo pendiente"}
                      </td>
                      <td className="px-4 py-3">{movement.reference}</td>
                      <td className="px-4 py-3">{formatCurrency(movement.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(movement.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "addresses" && (
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
      )}

      {activeTab === "quotes" && (
        <ClientRelatedSection
          title="Cotizaciones"
          description="Cotizaciones simuladas asociadas al cliente."
          emptyMessage="Todavía no hay cotizaciones simuladas para este cliente."
          items={relatedDocuments.quotes}
        />
      )}

      {activeTab === "orders" && (
        <ClientRelatedSection
          title="Pedidos"
          description="Pedidos simulados vinculados al cliente."
          emptyMessage="Todavía no hay pedidos simulados para este cliente."
          items={relatedDocuments.orders}
        />
      )}

      {activeTab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle>Actividad</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay actividad simulada disponible.</p>
            ) : (
              activity.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatDate(entry.date)}</p>
                  <p className="mt-1 font-medium">{entry.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
