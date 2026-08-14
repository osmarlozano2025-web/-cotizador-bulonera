import { Button } from "@/components/ui/button";
import type { BranchId, SellerId } from "@/domain/shared";
import type { AccountStatus, ClientCommercialStatus } from "@/domain/client/types";
import type { ClientListFilters } from "../types";

interface Option<TValue extends string> {
  readonly id: TValue;
  readonly label: string;
}

interface ClientFiltersProps {
  readonly value: ClientListFilters;
  readonly branchOptions: readonly Option<BranchId>[];
  readonly sellerOptions: readonly Option<SellerId>[];
  readonly onChange: (next: ClientListFilters) => void;
  readonly onClear: () => void;
}

function updateFilter<TKey extends keyof ClientListFilters>(
  value: ClientListFilters,
  key: TKey,
  nextValue: ClientListFilters[TKey],
): ClientListFilters {
  return {
    ...value,
    [key]: nextValue,
  };
}

export function ClientFilters({
  value,
  branchOptions,
  sellerOptions,
  onChange,
  onClear,
}: ClientFiltersProps): React.JSX.Element {
  const commercialStatuses: readonly { id: ClientCommercialStatus | "all"; label: string }[] = [
    { id: "all", label: "Todos los estados" },
    { id: "active", label: "Activo" },
    { id: "inactive", label: "Inactivo" },
    { id: "blocked", label: "Bloqueado" },
    { id: "suspended", label: "Suspendido" },
    { id: "pendingApproval", label: "Pendiente de aprobación" },
    { id: "underReview", label: "En revisión" },
  ];

  const accountStatuses: readonly { id: AccountStatus | "all"; label: string }[] = [
    { id: "all", label: "Todas las cuentas" },
    { id: "current", label: "Al día" },
    { id: "overdue", label: "Vencidas" },
    { id: "exceededCreditLimit", label: "Límite superado" },
    { id: "blocked", label: "Bloqueadas" },
    { id: "underReview", label: "En revisión" },
  ];

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-6">
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Buscar</span>
        <input
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Código, razón social, CUIT, correo, teléfono, vendedor"
          value={value.search}
          onChange={(event) => onChange(updateFilter(value, "search", event.target.value))}
        />
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Estado comercial</span>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.commercialStatus}
          onChange={(event) =>
            onChange(updateFilter(value, "commercialStatus", event.target.value as ClientListFilters["commercialStatus"]))
          }
        >
          {commercialStatuses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Estado de cuenta</span>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.accountStatus}
          onChange={(event) =>
            onChange(updateFilter(value, "accountStatus", event.target.value as ClientListFilters["accountStatus"]))
          }
        >
          {accountStatuses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Vendedor</span>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.sellerId}
          onChange={(event) =>
            onChange(updateFilter(value, "sellerId", event.target.value as ClientListFilters["sellerId"]))
          }
        >
          <option value="all">Todos</option>
          <option value="unassigned">Sin asignar</option>
          {sellerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Sucursal</span>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.branchId}
          onChange={(event) =>
            onChange(updateFilter(value, "branchId", event.target.value as ClientListFilters["branchId"]))
          }
        >
          <option value="all">Todas</option>
          {branchOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Deuda</span>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value.debtView}
          onChange={(event) =>
            onChange(updateFilter(value, "debtView", event.target.value as ClientListFilters["debtView"]))
          }
        >
          <option value="all">Todos</option>
          <option value="withDebt">Con deuda</option>
          <option value="blocked">Bloqueados</option>
          <option value="pendingApproval">Pendientes</option>
        </select>
      </label>

      <div className="flex items-end lg:col-span-6">
        <Button type="button" variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
