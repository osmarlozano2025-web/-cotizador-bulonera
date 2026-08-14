import type { NavigationSection } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { SidebarItem } from "./sidebar-item";

interface SidebarSectionProps { section: NavigationSection; collapsed: boolean; onNavigate?: (() => void) | undefined; }
export function SidebarSection({section,collapsed,onNavigate}:SidebarSectionProps):React.JSX.Element { return <section className="space-y-1"><p className={cn("px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",collapsed&&"sr-only")}>{section.label}</p>{section.items.map((item)=><SidebarItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate}/>)}</section>; }
