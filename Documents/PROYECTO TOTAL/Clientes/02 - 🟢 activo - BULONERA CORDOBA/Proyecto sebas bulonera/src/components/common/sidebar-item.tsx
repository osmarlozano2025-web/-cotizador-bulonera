import { NavLink } from "react-router-dom";
import type { NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/cn";

interface SidebarItemProps { item: NavigationItem; collapsed: boolean; onNavigate?: (() => void) | undefined; }
export function SidebarItem({item,collapsed,onNavigate}:SidebarItemProps):React.JSX.Element { const Icon=item.icon; return <NavLink to={item.path} onClick={onNavigate} title={collapsed?item.label:undefined} className={({isActive})=>cn("flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",isActive&&"bg-muted font-medium text-foreground",collapsed&&"justify-center px-0")}><Icon className="size-[18px] shrink-0"/><span className={cn("truncate",collapsed&&"sr-only")}>{item.label}</span></NavLink>; }
