import { Card, CardContent } from "@/components/ui/card";
import { formatCommercialDateTime, formatCurrency } from "@/features/clients/utils/formatters";
import type { AccountMovement } from "../types";
import { AccountMovementStatusBadge, AccountMovementTypeBadge } from "./account-status-badge";

export function AccountMovementTable({
  movements,
}: {
  readonly movements: readonly AccountMovement[];
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Débito</th>
              <th className="px-4 py-3">Crédito</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id} className="border-b last:border-b-0">
                <td className="px-4 py-4">{formatCommercialDateTime(movement.issueDate)}</td>
                <td className="px-4 py-4"><AccountMovementTypeBadge type={movement.type} /></td>
                <td className="px-4 py-4 font-medium">{movement.documentNumber}</td>
                <td className="px-4 py-4">{movement.description}</td>
                <td className="px-4 py-4">{formatCurrency(movement.debitAmount)}</td>
                <td className="px-4 py-4">{formatCurrency(movement.creditAmount)}</td>
                <td className="px-4 py-4 font-medium">{formatCurrency(movement.balanceAfter)}</td>
                <td className="px-4 py-4"><AccountMovementStatusBadge status={movement.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
