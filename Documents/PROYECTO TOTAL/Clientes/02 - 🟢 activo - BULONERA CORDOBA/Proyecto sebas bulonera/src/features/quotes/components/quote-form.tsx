import type { ReactNode } from "react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { calculateQuoteItemSubtotal, calculateQuoteItemTotal, calculateQuoteTotals } from "../utils/quote-calculations";
import { buildEmptyQuoteItem, buildQuoteFormDefaults, createQuoteFormSchema } from "../schemas/quote-schema";
import type { QuoteFormValues, QuoteReferenceData } from "../types";

interface QuoteFormProps {
  readonly title: string;
  readonly description: string;
  readonly referenceData: QuoteReferenceData;
  readonly initialValues?: QuoteFormValues;
  readonly submitLabel: string;
  readonly secondaryAction?: ReactNode;
  readonly onSubmit: (values: QuoteFormValues) => void | Promise<void>;
}

function FieldShell({
  label,
  hint,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: ReactNode;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const textareaClassName = "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

function collectErrorMessages(value: unknown): readonly string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value !== "object") {
    return [];
  }

  const message = (value as { message?: unknown }).message;
  const nestedValues = Object.values(value as Record<string, unknown>);
  const nestedMessages = nestedValues.flatMap((nestedValue) => collectErrorMessages(nestedValue));

  if (typeof message === "string" && message.length > 0) {
    return [message, ...nestedMessages];
  }

  return nestedMessages;
}

export function QuoteForm({
  title,
  description,
  referenceData,
  initialValues,
  submitLabel,
  secondaryAction,
  onSubmit,
}: QuoteFormProps): React.JSX.Element {
  const schema = useMemo(() => createQuoteFormSchema(referenceData), [referenceData]);
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(schema) as Resolver<QuoteFormValues>,
    defaultValues: initialValues ?? buildQuoteFormDefaults(referenceData),
    mode: "onSubmit",
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const totals = calculateQuoteTotals(watchedItems ?? []);

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit((values) => {
          void onSubmit(values);
        })(event);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Cliente">
            <select className={inputClassName} {...form.register("clientId")}>
              <option value="">Seleccioná un cliente</option>
              {referenceData.clientOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Vendedor">
            <select className={inputClassName} {...form.register("sellerId")}>
              <option value="">Seleccioná un vendedor</option>
              {referenceData.sellerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Estado">
            <select className={inputClassName} {...form.register("status")}>
              <option value="draft">Borrador</option>
              <option value="pendingApproval">Pendiente de aprobación</option>
              <option value="sent">Enviada</option>
              <option value="accepted">Aceptada</option>
              <option value="rejected">Rechazada</option>
              <option value="expired">Vencida</option>
              <option value="converted">Convertida</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </FieldShell>
          <FieldShell label="Vigencia">
            <input className={inputClassName} type="date" {...form.register("validUntil")} />
          </FieldShell>
          <FieldShell label="Condiciones comerciales" hint="Opcional">
            <textarea className={textareaClassName} rows={3} {...form.register("commercialConditions")} />
          </FieldShell>
          <FieldShell label="Observaciones" hint="Opcional">
            <textarea className={textareaClassName} rows={3} {...form.register("notes")} />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Productos</CardTitle>
            <p className="text-sm text-muted-foreground">Agregá ítems, ajustá cantidades y definí descuentos por línea.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              append(buildEmptyQuoteItem(referenceData, fields.length));
            }}
          >
            Agregar ítem
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {fields.map((field, index) => {
            const item = watchedItems?.[index];
            const safeItem = item ?? { quantity: 0, unitPrice: 0, discountPercentage: 0 };
            const subtotal = calculateQuoteItemSubtotal(safeItem);
            const total = calculateQuoteItemTotal(safeItem);

            return (
              <div key={field.id} className="grid gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Ítem {index + 1}</p>
                  <Button type="button" variant="ghost" onClick={() => remove(index)}>
                    Eliminar
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FieldShell label="Producto">
                    <select className={inputClassName} {...form.register(`items.${index}.productId` as const)}>
                      {referenceData.productOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.code} · {option.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                  <FieldShell label="Descripción">
                    <input className={inputClassName} {...form.register(`items.${index}.description` as const)} />
                  </FieldShell>
                  <FieldShell label="Cantidad">
                    <input className={inputClassName} type="number" min="1" step="1" {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })} />
                  </FieldShell>
                  <FieldShell label="Precio unitario">
                    <input className={inputClassName} type="number" min="0" step="1" {...form.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })} />
                  </FieldShell>
                  <FieldShell label="Descuento %">
                    <input className={inputClassName} type="number" min="0" max="100" step="0.1" {...form.register(`items.${index}.discountPercentage` as const, { valueAsNumber: true })} />
                  </FieldShell>
                  <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subtotal</p>
            <p className="mt-1 font-medium">{formatCurrency(totals.subtotal)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Descuento</p>
            <p className="mt-1 font-medium">{formatCurrency(totals.discountTotal)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 font-semibold">{formatCurrency(totals.total)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidades</p>
            <p className="mt-1 font-medium">{totals.unitsCount}</p>
          </div>
        </CardContent>
      </Card>

      {collectErrorMessages(form.formState.errors).length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6">
            <div className="grid gap-2 text-sm text-rose-700">
              {collectErrorMessages(form.formState.errors).map((message, index) => (
                <p key={`${message}-${index}`}>{message}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{submitLabel}</Button>
        {secondaryAction}
      </div>
    </form>
  );
}
