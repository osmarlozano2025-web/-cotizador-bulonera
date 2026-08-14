import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Client } from "@/domain/client/client";
import type { ClientStatus } from "@/domain/client/types";
import { formatCurrency } from "../utils/formatters";
import { ClientAccountStatusBadge, ClientCommercialStatusBadge } from "./client-status-badge";
import type { ClientCapabilities, ClientListSort, ClientSortField, ClientPreviewRow } from "../types";

interface ClientTableProps {
  readonly rows: readonly ClientPreviewRow[];
  readonly capabilities: ClientCapabilities;
  readonly sort: ClientListSort;
  readonly onSort: (field: ClientSortField) => void;
  readonly onChangeStatus: (clientId: Client["id"], status: ClientStatus) => void | Promise<void>;
  readonly onOpenAccount: (clientId: Client["id"]) => void;
}

const STATUS_OPTIONS: readonly { id: ClientStatus; label: string }[] = [
  { id: "active", label: "Activo" },
  { id: "inactive", label: "Inactivo" },
  { id: "blocked", label: "Bloqueado" },
  { id: "suspended", label: "Suspendido" },
  { id: "pendingApproval", label: "Pendiente" },
];

function SortableHeading({
  label,
  field,
  sort,
  onSort,
}: {
  readonly label: string;
  readonly field: ClientSortField;
  readonly sort: ClientListSort;
  readonly onSort: (field: ClientSortField) => void;
}): React.JSX.Element {
  const isActive = sort.field === field;
  const Icon = !isActive ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto gap-1 px-0 text-left text-xs font-semibold uppercase tracking-wide text-inherit hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      <Icon className="size-3.5" />
    </Button>
  );
}

export function ClientTable({ rows, capabilities, sort, onSort, onChangeStatus, onOpenAccount }: ClientTableProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3"><SortableHeading label="Código" field="code" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3"><SortableHeading label="Razón social" field="legalName" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3">Nombre comercial</th>
                <th className="px-4 py-3">CUIT</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Lista de precios</th>
                <th className="px-4 py-3"><SortableHeading label="Deuda actual" field="debt" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3"><SortableHeading label="Límite" field="creditLimit" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3"><SortableHeading label="Estado comercial" field="commercialStatus" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3"><SortableHeading label="Estado cuenta" field="accountStatus" sort={sort} onSort={onSort} /></th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.client.id} className="align-top">
                  <td className="px-4 py-4 font-medium">{row.client.code}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{row.client.legalName}</div>
                    <div className="text-xs text-muted-foreground">{row.client.contactName ?? "Sin contacto"}</div>
                  </td>
                  <td className="px-4 py-4">{row.client.tradeName ?? "—"}</td>
                  <td className="px-4 py-4">{row.client.taxId}</td>
                  <td className="px-4 py-4">{row.sellerName}</td>
                  <td className="px-4 py-4">{row.priceListName}</td>
                  <td className="px-4 py-4">{capabilities.canSeeDebt ? formatCurrency(row.client.currentDebt.amount) : "Reservado"}</td>
                  <td className="px-4 py-4">{capabilities.canSeeCreditLimit ? formatCurrency(row.client.creditLimit.amount) : "Reservado"}</td>
                  <td className="px-4 py-4">
                    <ClientCommercialStatusBadge status={row.client.commercialStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <ClientAccountStatusBadge status={row.accountSummary.accountStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                          <Link to={`/clients/${row.client.id}`}>Ver</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link to={`/clients/${row.client.id}/edit`}>Editar</Link>
                        </Button>
                        <Button variant="outline" onClick={() => onOpenAccount(row.client.id)}>
                          Cuenta
                        </Button>
                      </div>
                      {capabilities.canChangeStatus && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Estado</span>
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            value={row.client.status}
                            onChange={(event) => {
                              void onChangeStatus(row.client.id, event.target.value as ClientStatus);
                            }}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{capabilities.canSeeDebt ? (row.accountSummary.creditAvailable >= 0 ? "Disponible" : "Saldo crítico") : "Reservado"}</span>
                        <span>{capabilities.canSeeDebt ? formatCurrency(row.accountSummary.creditAvailable) : "Reservado"}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          {row.accountSummary.ordersCount} pedidos
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.accountSummary.needsAuthorization ? "Requiere autorización" : "Puede operar normalmente"}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
