import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { appConfig } from "@/config/app";
import { AuthShell } from "../components/auth-shell";
import { useAuth } from "../hooks/use-auth";
import { getPostLoginPath } from "../services/auth-service";

const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage(): React.JSX.Element {
  const { session, signIn, isLoading, error } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle(`${appConfig.name} · Iniciar sesión`);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (session !== null) {
      void navigate(getPostLoginPath(session.user.roles), { replace: true });
    }
  }, [navigate, session]);

  return (
    <AuthShell>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Iniciar sesión</CardTitle>
        <p className="text-sm text-muted-foreground">Accedé al ERP con tu cuenta autorizada.</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit((values) => {
              void (async () => {
                try {
                  const nextSession = await signIn(values);
                  void navigate(getPostLoginPath(nextSession.user.roles), { replace: true });
                } catch {
                  // AuthProvider exposes the gateway error in the form.
                }
              })();
            })(event);
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Correo</label>
            <input id="email" type="email" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
            <input id="password" type="password" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>}
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Ingresando..." : "Ingresar"}</Button>
          <div className="flex items-center justify-between text-sm">
            <Link className="text-primary underline-offset-4 hover:underline" to="/forgot-password">Olvidé mi contraseña</Link>
            <span className="text-muted-foreground">Solo usuarios autorizados</span>
          </div>
        </form>
      </CardContent>
    </AuthShell>
  );
}
