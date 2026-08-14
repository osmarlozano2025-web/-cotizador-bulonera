import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountDetailData } from "../types";

export function AccountAlertBanner({
  detail,
}: {
  readonly detail: AccountDetailData;
}): React.JSX.Element | null {
  if (detail.evaluation.canOperate && !detail.hasPendingApproval) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex gap-3 p-4 text-amber-800">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="grid gap-2">
          <p className="font-medium">Cuenta con alerta comercial</p>
          <p className="text-sm">{detail.evaluation.recommendation}</p>
          {detail.evaluation.reasons.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {detail.evaluation.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
