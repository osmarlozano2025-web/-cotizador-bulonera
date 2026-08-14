import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppBreadcrumb } from "@/components/common/app-breadcrumb";
import { AppFooter } from "@/components/common/app-footer";
import { AppHeader } from "@/components/common/app-header";
import { AppSidebar } from "@/components/common/app-sidebar";
import { PageContainer } from "@/components/common/page-container";

export function AppLayout():React.JSX.Element { const [sidebarCollapsed,setSidebarCollapsed]=useState(false);const [mobileOpen,setMobileOpen]=useState(false);return <div className="flex min-h-screen bg-background"><AppSidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onCollapsedChange={()=>setSidebarCollapsed((value)=>!value)} onMobileClose={()=>setMobileOpen(false)}/><div className="flex min-h-screen min-w-0 flex-1 flex-col"><AppHeader onMenuOpen={()=>setMobileOpen(true)}/><div className="border-b bg-card px-4 py-3 md:px-6"><PageContainer><AppBreadcrumb/></PageContainer></div><main className="flex-1 p-4 md:p-6 lg:p-8"><PageContainer><Outlet/></PageContainer></main><AppFooter/></div></div>; }
