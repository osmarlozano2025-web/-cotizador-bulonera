import { Bell, ChevronDown, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Brand } from "@/components/common/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/features/auth/role-labels";

interface AppHeaderProps { onMenuOpen: () => void; }
export function AppHeader({onMenuOpen}:AppHeaderProps):React.JSX.Element {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = session?.user.displayName ?? "Usuario";
  const roleLabel = session?.user.roles[0] !== undefined ? getRoleLabel(session.user.roles[0]) : "Rol pendiente";

  return <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6"><Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuOpen} aria-label="Abrir navegación"><Menu className="size-5"/></Button><div className="min-w-0 md:hidden"><Brand/></div><div className="hidden max-w-md flex-1 md:block"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input type="search" placeholder="Buscar en la plataforma..." aria-label="Buscador global" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"/></div></div><div className="ml-auto flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Notificaciones"><Bell className="size-[18px]"/></Button><Button variant="ghost" size="icon" aria-label="Configuración"><Settings className="size-[18px]"/></Button><button type="button" className="ml-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted" aria-label="Opciones del perfil"><span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{displayName.slice(0,2).toUpperCase()}</span><span className="hidden lg:block"><span className="block text-sm font-medium leading-tight">{displayName}</span><span className="block text-xs text-muted-foreground">{roleLabel}</span></span><ChevronDown className="hidden size-4 text-muted-foreground sm:block"/></button><Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => { void signOut().then(() => navigate("/login", { replace: true })); }}><LogOut className="size-[18px]"/></Button><div className="hidden" aria-hidden="true"><UserRound/></div></div></header>;
}
