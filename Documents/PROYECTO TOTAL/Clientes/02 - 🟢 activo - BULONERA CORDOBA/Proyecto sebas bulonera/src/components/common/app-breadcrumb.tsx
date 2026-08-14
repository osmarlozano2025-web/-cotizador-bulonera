import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { buildBreadcrumbItems } from "@/config/breadcrumbs";

export function AppBreadcrumb(): React.JSX.Element {
  const { pathname } = useLocation();
  const items = buildBreadcrumbItems(pathname);

  return (
    <nav aria-label="Ruta de navegación" className="flex min-h-5 items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
      <Link to="/dashboard" className="flex shrink-0 items-center gap-1 hover:text-foreground">
        <Home className="size-3.5" />
        <span>Inicio</span>
      </Link>
      {items.map((item) => (
        <span key={item.path} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0" />
          {item.current ? (
            <span className="truncate font-medium text-foreground">{item.label}</span>
          ) : (
            <Link to={item.path} className="truncate hover:text-foreground">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
