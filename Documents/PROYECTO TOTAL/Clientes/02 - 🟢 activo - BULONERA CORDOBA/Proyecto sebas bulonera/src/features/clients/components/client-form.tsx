import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientFormValues, ClientReferenceData } from "../types";
import { createClientFormSchema } from "../schemas/client-schema";
import { DEFAULT_CLIENT_FORM_VALUES } from "../schemas/client-schema";
import { ClientFormError, type ClientFormFieldName } from "../errors";

interface ClientFormProps {
  readonly title: string;
  readonly description: string;
  readonly referenceData: ClientReferenceData;
  readonly initialValues?: ClientFormValues;
  readonly submitLabel: string;
  readonly cancelLabel?: string;
  readonly onCancel?: () => void;
  readonly secondaryAction?: ReactNode;
  readonly onSubmit: (values: ClientFormValues) => void | Promise<void>;
}

function FieldShell({
  label,
  hint,
  error,
  children,
}: {
  readonly label: string;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly children: ReactNode;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary";

const textareaClassName =
  "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary";

export function ClientForm({
  title,
  description,
  referenceData,
  initialValues,
  submitLabel,
  cancelLabel = "Cancelar",
  onCancel,
  secondaryAction,
  onSubmit,
}: ClientFormProps): React.JSX.Element {
  const schema = useMemo(() => createClientFormSchema(referenceData), [referenceData]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(schema) as Resolver<ClientFormValues>,
    defaultValues: initialValues ?? DEFAULT_CLIENT_FORM_VALUES,
    mode: "onSubmit",
  });
  const getFieldError = (field: ClientFormFieldName): string | undefined => {
    const error = form.formState.errors[field];
    return typeof error?.message === "string" ? error.message : undefined;
  };

  const handleCancel = (): void => {
    if (onCancel === undefined) {
      return;
    }

    if (form.formState.isDirty && !globalThis.confirm("Tenés cambios sin guardar. ¿Querés salir igual?")) {
      return;
    }

    onCancel();
  };

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit((values) => {
          if (!form.formState.isDirty) {
            setFeedback("No hay cambios para guardar.");
            return;
          }

          void (async () => {
            try {
              form.clearErrors();
              await onSubmit(values);
            } catch (error) {
              if (error instanceof ClientFormError) {
                for (const [field, message] of Object.entries(error.fieldErrors)) {
                  if (message !== undefined) {
                    form.setError(field as ClientFormFieldName, { type: "server", message });
                  }
                }
                setFeedback(error.message);
                return;
              }

              setFeedback(error instanceof Error ? error.message : "No se pudo guardar el cliente.");
            }
          })();
        })(event);
      }}
    >
      {feedback && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 text-sm text-sky-800">{feedback}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="Código" error={getFieldError("clientCode")}>
              <input className={inputClassName} {...form.register("clientCode")} />
            </FieldShell>
            <FieldShell label="Razón social" error={getFieldError("legalName")}>
              <input className={inputClassName} {...form.register("legalName")} />
            </FieldShell>
            <FieldShell label="Nombre comercial" error={getFieldError("tradeName")}>
              <input className={inputClassName} {...form.register("tradeName")} />
            </FieldShell>
            <FieldShell label="CUIT" error={getFieldError("taxId")}>
              <input className={inputClassName} {...form.register("taxId")} />
            </FieldShell>
            <FieldShell label="Correo electrónico" error={getFieldError("email")}>
              <input className={inputClassName} type="email" {...form.register("email")} />
            </FieldShell>
            <FieldShell label="Teléfono" error={getFieldError("phone")}>
              <input className={inputClassName} {...form.register("phone")} />
            </FieldShell>
            <FieldShell label="Nombre de contacto" error={getFieldError("contactName")}>
              <input className={inputClassName} {...form.register("contactName")} />
            </FieldShell>
            <FieldShell label="Estado comercial" error={getFieldError("commercialStatus")}>
              <select className={inputClassName} {...form.register("commercialStatus")}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="blocked">Bloqueado</option>
                <option value="suspended">Suspendido</option>
                <option value="pendingApproval">Pendiente de aprobación</option>
                <option value="underReview">En revisión</option>
              </select>
            </FieldShell>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos comerciales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Vendedor asignado" hint="Opcional" error={getFieldError("assignedSellerId")}>
            <select className={inputClassName} {...form.register("assignedSellerId")}>
              <option value="">Sin asignar</option>
              {referenceData.sellerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Lista de precios" hint="Opcional" error={getFieldError("priceListId")}>
            <select className={inputClassName} {...form.register("priceListId")}>
              <option value="">Sin lista</option>
              {referenceData.priceListOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Descuento general" error={getFieldError("generalDiscountPercentage")}>
            <input
              className={inputClassName}
              type="number"
              min="0"
              max="100"
              step="1"
              {...form.register("generalDiscountPercentage", { valueAsNumber: true })}
            />
          </FieldShell>
          <FieldShell label="Límite de crédito" error={getFieldError("creditLimit")}>
            <input className={inputClassName} type="number" min="0" step="1" {...form.register("creditLimit", { valueAsNumber: true })} />
          </FieldShell>
          <FieldShell label="Condición de pago" error={getFieldError("paymentCondition")}>
            <select className={inputClassName} {...form.register("paymentCondition")}>
              <option value="">Seleccioná una condición</option>
              {referenceData.paymentConditionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Estado de cuenta" error={getFieldError("accountStatus")}>
            <select className={inputClassName} {...form.register("accountStatus")}>
              <option value="current">Al día</option>
              <option value="overdue">Vencida</option>
              <option value="exceededCreditLimit">Límite superado</option>
              <option value="blocked">Bloqueada</option>
              <option value="underReview">En revisión</option>
            </select>
          </FieldShell>
          <FieldShell label="Observaciones" hint="Opcional" error={getFieldError("notes")}>
            <textarea className={textareaClassName} rows={4} {...form.register("notes")} />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dirección principal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Tipo de dirección" error={getFieldError("addressType")}>
            <select className={inputClassName} {...form.register("addressType")}>
              <option value="commercial">Comercial</option>
              <option value="billing">Facturación</option>
              <option value="shipping">Envío</option>
            </select>
          </FieldShell>
          <FieldShell label="Calle" error={getFieldError("street")}>
            <input className={inputClassName} {...form.register("street")} />
          </FieldShell>
          <FieldShell label="Número" error={getFieldError("streetNumber")}>
            <input className={inputClassName} {...form.register("streetNumber")} />
          </FieldShell>
          <FieldShell label="Ciudad" error={getFieldError("city")}>
            <input className={inputClassName} {...form.register("city")} />
          </FieldShell>
          <FieldShell label="Provincia" error={getFieldError("province")}>
            <input className={inputClassName} {...form.register("province")} />
          </FieldShell>
          <FieldShell label="Código postal" error={getFieldError("postalCode")}>
            <input className={inputClassName} {...form.register("postalCode")} />
          </FieldShell>
          <FieldShell label="País" error={getFieldError("country")}>
            <input className={inputClassName} {...form.register("country")} />
          </FieldShell>
          <FieldShell label="Referencias" hint="Opcional" error={getFieldError("references")}>
            <input className={inputClassName} {...form.register("references")} />
          </FieldShell>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" className="size-4" {...form.register("isDefault")} />
            <span className="text-sm">Marcar como dirección principal</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
        )}
        {secondaryAction}
      </div>
    </form>
  );
}
