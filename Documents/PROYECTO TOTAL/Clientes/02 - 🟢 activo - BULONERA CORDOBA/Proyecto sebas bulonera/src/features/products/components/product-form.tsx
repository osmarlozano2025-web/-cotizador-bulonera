import type { ReactNode } from "react";
import { useMemo } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/features/clients/utils/formatters";
import { buildProductFormDefaults, createProductFormSchema } from "../schemas/product-schema";
import type { ProductFormValues, ProductReferenceData } from "../types";
import { getProductStockState } from "../utils/product-calculations";

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

export function ProductForm({
  title,
  description,
  referenceData,
  initialValues,
  submitLabel,
  submitError,
  requireChanges = false,
  onCancel,
  onSubmit,
}: {
  readonly title: string;
  readonly description: string;
  readonly referenceData: ProductReferenceData;
  readonly initialValues?: ProductFormValues;
  readonly submitLabel: string;
  readonly submitError?: string | null;
  readonly requireChanges?: boolean;
  readonly onCancel?: () => void;
  readonly onSubmit: (values: ProductFormValues) => void | Promise<void>;
}): React.JSX.Element {
  const schema = useMemo(() => createProductFormSchema(referenceData), [referenceData]);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema) as Resolver<ProductFormValues>,
    defaultValues: initialValues ?? buildProductFormDefaults(referenceData),
    mode: "onSubmit",
  });
  const watched = useWatch({ control: form.control });
  const stockState = getProductStockState({
    stockQuantity: watched?.stockQuantity ?? 0,
    minimumStock: watched?.minimumStock ?? 0,
  });
  const lineOptions = referenceData.linesByFamilyId[watched?.familyId ?? ""] ?? referenceData.lineOptions;

  return (
    <form noValidate className="grid gap-6" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit((values) => { void onSubmit(values); })(event); }}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Código interno">
            <input className={inputClassName} {...form.register("internalCode")} />
          </FieldShell>
          <FieldShell label="Código Tango" hint="Opcional">
            <input className={inputClassName} {...form.register("tangoCode")} />
          </FieldShell>
          <FieldShell label="Nombre">
            <input className={inputClassName} {...form.register("name")} />
          </FieldShell>
          <FieldShell label="Marca" hint="Opcional">
            <input className={inputClassName} {...form.register("brand")} />
          </FieldShell>
          <FieldShell label="Familia">
            <select
              className={inputClassName}
              {...form.register("familyId", {
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const firstLine = referenceData.linesByFamilyId[event.target.value]?.[0];
                  form.setValue("lineId", firstLine?.id ?? "", { shouldDirty: true, shouldValidate: true });
                },
              })}
            >
              {referenceData.familyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="Línea">
            <select className={inputClassName} {...form.register("lineId")}>
              {lineOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="Unidad">
            <select className={inputClassName} {...form.register("unitOfMeasure")}>
              {referenceData.unitOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="Estado">
            <select className={inputClassName} {...form.register("status")}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="blocked">Bloqueado</option>
              <option value="archived">Archivado</option>
            </select>
          </FieldShell>
          <FieldShell label="Precio base">
            <input className={inputClassName} type="number" min="0" step="1" {...form.register("basePrice", { valueAsNumber: true })} />
          </FieldShell>
          <FieldShell label="Stock">
            <input className={inputClassName} type="number" min="0" step="1" {...form.register("stockQuantity", { valueAsNumber: true })} />
          </FieldShell>
          <FieldShell label="Stock mínimo">
            <input className={inputClassName} type="number" min="0" step="1" {...form.register("minimumStock", { valueAsNumber: true })} />
          </FieldShell>
          <FieldShell label="Descripción" hint="Opcional">
            <textarea className={textareaClassName} rows={3} {...form.register("description")} />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Precio</p><p className="mt-1 font-medium">{formatCurrency(watched?.basePrice ?? 0)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Stock</p><p className="mt-1 font-medium">{watched?.stockQuantity ?? 0}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Stock mínimo</p><p className="mt-1 font-medium">{watched?.minimumStock ?? 0}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Estado de stock</p><p className="mt-1 font-medium">{stockState === "ok" ? "Disponible" : stockState === "low" ? "Bajo" : "Sin stock"}</p></div>
        </CardContent>
      </Card>

      {Object.keys(form.formState.errors).length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6">
            <div className="grid gap-2 text-sm text-rose-700">
              {Object.entries(form.formState.errors).map(([key, error]) => <p key={key}>{error?.message}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {submitError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>
      )}

      {requireChanges && !form.formState.isDirty && (
        <p className="text-sm text-muted-foreground">No hay cambios para guardar.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={requireChanges && !form.formState.isDirty}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={() => {
          if (!form.formState.isDirty || globalThis.confirm("Hay cambios sin guardar. ¿Querés salir igualmente?")) {
            onCancel();
          }
        }}>Cancelar</Button>}
      </div>
    </form>
  );
}
