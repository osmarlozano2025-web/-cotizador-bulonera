import { PlaceholderPage } from "./placeholder-page";
export { ClientsPage } from "@/features/clients/pages/clients-page";
export { QuotesPage } from "@/features/quotes/pages/quotes-page";
export { OrdersPage } from "@/features/orders/pages";
export { ProductsPage } from "@/features/products/pages";
export { LogisticsPage } from "@/features/logistics/pages";
export { ReportsPage } from "@/features/reports/pages/reports-page";
export function SettingsPage():React.JSX.Element { return <PlaceholderPage title="Configuración" description="Espacio preparado para los parámetros generales de la plataforma."/>; }
export function UsersPage():React.JSX.Element { return <PlaceholderPage title="Usuarios" description="Espacio preparado para la futura administración de usuarios y accesos."/>; }
export function RoleDashboardPage({title}:{title:string}):React.JSX.Element { return <PlaceholderPage title={title} description="Dashboard reservado para este espacio de trabajo. Su contenido se definirá en una etapa posterior."/>; }
