import { Button } from "@/components/ui/button";
import type { QuoteDetailData } from "../types";

export function QuoteActions({
  detail,
  canEdit,
  canDuplicate,
  canConvert,
  onEdit,
  onDuplicate,
  onConvert,
  onPrint,
  onDownloadPdf,
}: {
  readonly detail: QuoteDetailData;
  readonly canEdit: boolean;
  readonly canDuplicate: boolean;
  readonly canConvert: boolean;
  readonly onEdit?: () => void;
  readonly onDuplicate?: () => void;
  readonly onConvert?: () => void;
  readonly onPrint?: () => void;
  readonly onDownloadPdf?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {canDuplicate && onDuplicate && (
        <Button type="button" variant="outline" onClick={onDuplicate}>
          Duplicar
        </Button>
      )}
      {canEdit && onEdit && (
        <Button type="button" variant="outline" onClick={onEdit}>
          Editar
        </Button>
      )}
      {canConvert && onConvert && (
        <Button type="button" variant="outline" onClick={onConvert} disabled={detail.quote.status !== "accepted"}>
          Convertir en Pedido
        </Button>
      )}
      {onPrint && (
        <Button type="button" variant="outline" onClick={onPrint}>
          Imprimir
        </Button>
      )}
      {onDownloadPdf && (
        <Button type="button" variant="outline" onClick={onDownloadPdf}>
          Descargar PDF
        </Button>
      )}
    </div>
  );
}
