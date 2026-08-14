import { FileChartColumn, FileText, LayoutDashboard, Package, PackageCheck, Settings, ShieldCheck, ShoppingCart, Truck, Users, UsersRound, Wallet, type LucideIcon } from "lucide-react";
import type { Permission } from "@/features/auth";

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly permission?: Permission;
}

export interface NavigationSection {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    label: "General",
    items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { label: "Clientes", path: "/clients", icon: UsersRound },
      { label: "Productos", path: "/products", icon: Package },
      { label: "Cotizaciones", path: "/quotes", icon: FileText },
      { label: "Autorizaciones", path: "/approvals", icon: ShieldCheck },
      { label: "Cuenta corriente", path: "/accounts", icon: Wallet },
      { label: "Pedidos", path: "/orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Logística", path: "/logistics", icon: Truck },
      { label: "Guías de despacho", path: "/dispatch", icon: PackageCheck },
      { label: "Reportes", path: "/reports", icon: FileChartColumn },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Usuarios", path: "/users", icon: Users },
      { label: "Configuración", path: "/settings", icon: Settings },
    ],
  },
] as const;

export const ROUTE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  dashboard: "Dashboard",
  admin: "Administración",
  sales: "Ventas",
  client: "Portal de clientes",
  warehouse: "Depósito",
  logistics: "Logística",
  dispatch: "Guías de despacho",
  clients: "Clientes",
  products: "Productos",
  quotes: "Cotizaciones",
  approvals: "Autorizaciones",
  accounts: "Cuenta corriente",
  orders: "Pedidos",
  reports: "Reportes",
  integrations: "Integraciones",
  tango: "Tango",
  jobs: "Jobs",
  mappings: "Mapeos",
  diagnostics: "Diagnóstico",
  users: "Usuarios",
  settings: "Configuración",
});
