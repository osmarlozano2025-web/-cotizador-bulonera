import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Brand } from "@/components/common/brand";
import { SidebarSection } from "@/components/common/sidebar-section";
import { Button } from "@/components/ui/button";
import { NAVIGATION_SECTIONS } from "@/config/navigation";
import { cn } from "@/lib/cn";

interface AppSidebarProps { collapsed: boolean; mobileOpen: boolean; onCollapsedChange: () => void; onMobileClose: () => void; }
export function AppSidebar({collapsed,mobileOpen,onCollapsedChange,onMobileClose}:AppSidebarProps):React.JSX.Element { return <>
  {mobileOpen&&<button type="button" className="fixed inset-0 z-40 bg-foreground/30 md:hidden" aria-label="Cerrar navegación" onClick={onMobileClose}/>}<aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform md:sticky md:top-0 md:z-30 md:h-screen md:translate-x-0",mobileOpen?"translate-x-0":"-translate-x-full",collapsed&&"md:w-[72px]")}>
    <div className="flex h-16 items-center justify-between border-b px-4"><Brand compact={collapsed}/><Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileClose} aria-label="Cerrar navegación"><X className="size-5"/></Button></div>
    <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Navegación principal">{NAVIGATION_SECTIONS.map((section)=><SidebarSection key={section.label} section={section} collapsed={collapsed} onNavigate={onMobileClose}/>)}</nav>
    <div className="hidden border-t p-3 md:block"><Button variant="ghost" className={cn("w-full justify-start",collapsed&&"px-0")} onClick={onCollapsedChange} aria-label={collapsed?"Expandir navegación":"Contraer navegación"}>{collapsed?<PanelLeftOpen className="size-4"/>:<><PanelLeftClose className="size-4"/><span>Contraer</span></>}</Button></div>
  </aside></>; }
