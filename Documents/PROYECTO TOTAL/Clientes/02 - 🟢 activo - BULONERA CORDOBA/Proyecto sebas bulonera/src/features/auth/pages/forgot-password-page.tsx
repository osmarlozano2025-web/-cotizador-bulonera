import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AuthShell } from "../components/auth-shell";
import { useAuth } from "../hooks/use-auth";

const resetSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido."),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export function ForgotPasswordPage(): React.JSX.Element {
  const { requestPasswordReset } = useAuth();
  useDocumentTitle(`${appConfig.name} · Recuperar contraseña`);
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  return (
    <AuthShell>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Recuperar contraseña</CardTitle>
        <p className="text-sm text-muted-foreground">Te enviaremos un enlace para restablecer tu acceso.</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit((values) => {
              void (async () => {
                await requestPasswordReset(values);
                form.reset({ email: "" });
              })();
            })(event);
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="reset-email">Correo</label>
            <input id="reset-email" type="email" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full">Enviar enlace</Button>
        </form>
      </CardContent>
    </AuthShell>
  );
}
