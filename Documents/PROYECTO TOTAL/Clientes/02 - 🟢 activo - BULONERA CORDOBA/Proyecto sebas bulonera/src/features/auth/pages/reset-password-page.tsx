import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AuthShell } from "../components/auth-shell";
import { useAuth } from "../hooks/use-auth";
import { getRedirectPathForRoles } from "../services/auth-service";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  confirmPassword: z.string().min(8, "Confirmá la contraseña."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage(): React.JSX.Element {
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle(`${appConfig.name} · Restablecer contraseña`);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <AuthShell>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Restablecer contraseña</CardTitle>
        <p className="text-sm text-muted-foreground">Elegí una nueva contraseña para continuar.</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit((values) => {
              void (async () => {
                await updatePassword({ password: values.password });
                void navigate(getRedirectPathForRoles(session?.user.roles ?? []), { replace: true });
              })();
            })(event);
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="new-password">Nueva contraseña</label>
            <input id="new-password" type="password" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirmar contraseña</label>
            <input id="confirm-password" type="password" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full">Guardar contraseña</Button>
        </form>
      </CardContent>
    </AuthShell>
  );
}
