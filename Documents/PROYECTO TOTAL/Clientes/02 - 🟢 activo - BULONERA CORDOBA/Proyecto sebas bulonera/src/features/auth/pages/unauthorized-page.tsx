import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AuthShell } from "../components/auth-shell";

export function UnauthorizedPage(): React.JSX.Element {
  useDocumentTitle(`${appConfig.name} · Acceso denegado`);
  return (
    <AuthShell>
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Rol pendiente de asignación</h1>
          <p className="text-sm text-muted-foreground">Tu sesión no tiene permisos suficientes para acceder a esta sección.</p>
        </div>
        <Button asChild>
          <Link to="/login">Volver al ingreso</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
