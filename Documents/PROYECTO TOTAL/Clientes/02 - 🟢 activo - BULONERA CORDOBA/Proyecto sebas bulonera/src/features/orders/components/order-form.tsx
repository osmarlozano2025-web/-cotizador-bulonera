import type { ReactNode } from "react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { MOCK_CLIENTS } from "@/features/clients/data/mock-clients";
import { buildEmptyOrderItem, buildOrderFormDefaults, createOrderFormSchema } from "../schemas/order-schema";
import { calculateOrderTotals, getOrderDueWarning } from "../utils/order-calculations";
import type { OrderFormValues, OrderReferenceData } from "../types";

const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const textareaClassName = "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

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

export function OrderForm({
  title,
  description,
  referenceData,
  initialValues,
  submitLabel,
  secondaryAction,
  onSubmit,
}: {
  readonly title: string;
  readonly description: string;
  readonly referenceData: OrderReferenceData;
  readonly initialValues?: OrderFormValues;
  readonly submitLabel: string;
  readonly secondaryAction?: ReactNode;
  readonly onSubmit: (values: OrderFormValues) => void | Promise<void>;
}): React.JSX.Element {
  const schema = useMemo(() => createOrderFormSchema(referenceData), [referenceData]);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(schema) as Resolver<OrderFormValues>,
    defaultValues: initialValues ?? buildOrderFormDefaults(referenceData),
    mode: "onSubmit",
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedClientId = useWatch({ control: form.control, name: "clientId" });
  const totals = calculateOrderTotals(watchedItems ?? []);
  const selectedClient = MOCK_CLIENTS.find((client) => client.id === watchedClientId);
  const clientWarning = selectedClient !== undefined ? getOrderDueWarning(selectedClient, totals.total) : null;

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
          <FieldShell label="Condición de pago">
            <input className={inputClassName} {...form.register("paymentCondition")} />
          </FieldShell>
          <FieldShell label="Dirección de entrega">
            <select className={inputClassName} {...form.register("deliveryAddressId")}>
              <option value="">Seleccioná una dirección</option>
              {(referenceData.addressesByClientId[watchedClientId] ?? []).map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Cotización origen" hint="Opcional">
            <select className={inputClassName} {...form.register("sourceQuoteId")}>
              <option value="">Sin cotización</option>
              {referenceData.quoteOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Observaciones" hint="Opcional">
            <textarea className={textareaClassName} rows={3} {...form.register("notes")} />
          </FieldShell>
        </CardContent>
      </Card>

      {clientWarning && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{clientWarning}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ítems</CardTitle>
            <p className="text-sm text-muted-foreground">Armá el pedido con productos, cantidades y descuentos por línea.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => append(buildEmptyOrderItem(referenceData, fields.length, watchedItems?.map((item) => item.productId) ?? []))}
          >
            Agregar ítem
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {fields.map((field, index) => (
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
                <FieldShell label="Notas" hint="Opcional">
                  <input className={inputClassName} {...form.register(`items.${index}.notes` as const)} />
                </FieldShell>
              </div>
              <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(itemSubtotal(watchedItems?.[index]))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-medium">{formatCurrency(itemDiscount(watchedItems?.[index]))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatCurrency(itemTotal(watchedItems?.[index]))}</span>
                </div>
              </div>
            </div>
          ))}
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Líneas</p>
            <p className="mt-1 font-medium">{totals.itemsCount}</p>
          </div>
        </CardContent>
      </Card>

      {Object.keys(form.formState.errors).length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6">
            <div className="grid gap-2 text-sm text-rose-700">
              {Object.entries(form.formState.errors).map(([key, error]) => (
                <p key={key}>{error?.message}</p>
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

function itemSubtotal(item?: OrderFormValues["items"][number]): number {
  if (item === undefined) {
    return 0;
  }

  return Math.round((item.quantity * item.unitPrice + Number.EPSILON) * 100) / 100;
}

function itemDiscount(item?: OrderFormValues["items"][number]): number {
  if (item === undefined) {
    return 0;
  }

  return Math.round(((item.quantity * item.unitPrice * item.discountPercentage) / 100 + Number.EPSILON) * 100) / 100;
}

function itemTotal(item?: OrderFormValues["items"][number]): number {
  if (item === undefined) {
    return 0;
  }

  return Math.round((item.quantity * item.unitPrice - (item.quantity * item.unitPrice * item.discountPercentage) / 100 + Number.EPSILON) * 100) / 100;
}
