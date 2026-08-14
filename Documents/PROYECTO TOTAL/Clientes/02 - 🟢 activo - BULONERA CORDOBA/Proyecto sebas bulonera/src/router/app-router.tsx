import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/app-layout";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, UnauthorizedPage } from "@/features/auth/pages";
import { DashboardPage } from "@/pages/dashboard-page";
import { ClientsPage, LogisticsPage, OrdersPage, ProductsPage, QuotesPage, ReportsPage, RoleDashboardPage, SettingsPage, UsersPage } from "@/pages/module-pages";
import { ClientDetailPage } from "@/features/clients/pages/client-detail-page";
import { ClientEditPage } from "@/features/clients/pages/client-edit-page";
import { ClientNewPage } from "@/features/clients/pages/client-new-page";
import { ApprovalDetailPage, ApprovalsPage } from "@/features/approvals/pages";
import { AccountDetailPage, AccountsPage } from "@/features/accounts/pages";
import { OrderDetailPage, OrderEditPage, OrderNewPage } from "@/features/orders/pages";
import { QuoteDetailPage } from "@/features/quotes/pages/quote-detail-page";
import { QuoteEditPage } from "@/features/quotes/pages/quote-edit-page";
import { QuoteNewPage } from "@/features/quotes/pages/quote-new-page";
import { ProductDetailPage, ProductEditPage, ProductNewPage } from "@/features/products/pages";
import { DispatchDetailPage, DispatchEditPage, DispatchNewPage, DispatchPage } from "@/features/dispatch/pages";
import { OrderLogisticsPage } from "@/features/logistics/pages";
import { IntegrationsPage, TangoDiagnosticsPage, TangoIntegrationPage, TangoMappingsPage, TangoSettingsPage, TangoSyncJobDetailPage, TangoSyncJobsPage } from "@/features/tango-integration/pages";
import { NotFoundPage } from "@/pages/not-found-page";

export const appRouter = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "admin", element: <RoleDashboardPage title="Administración" /> },
          { path: "sales", element: <RoleDashboardPage title="Ventas" /> },
          { path: "client", element: <RoleDashboardPage title="Portal de clientes" /> },
          { path: "warehouse", element: <RoleDashboardPage title="Depósito" /> },
          { path: "logistics", element: <LogisticsPage /> },
          { path: "integrations", element: <IntegrationsPage /> },
          { path: "integrations/tango", element: <TangoIntegrationPage /> },
          { path: "integrations/tango/jobs", element: <TangoSyncJobsPage /> },
          { path: "integrations/tango/jobs/:jobId", element: <TangoSyncJobDetailPage /> },
          { path: "integrations/tango/mappings", element: <TangoMappingsPage /> },
          { path: "integrations/tango/settings", element: <TangoSettingsPage /> },
          { path: "integrations/tango/diagnostics", element: <TangoDiagnosticsPage /> },
          { path: "logistics/orders/:orderId", element: <OrderLogisticsPage /> },
          { path: "dispatch", element: <DispatchPage /> },
          { path: "dispatch/new/:orderId", element: <DispatchNewPage /> },
          { path: "dispatch/:dispatchGuideId", element: <DispatchDetailPage /> },
          { path: "dispatch/:dispatchGuideId/edit", element: <DispatchEditPage /> },
          { path: "clients", element: <ClientsPage /> },
          { path: "clients/new", element: <ClientNewPage /> },
          { path: "clients/:clientId", element: <ClientDetailPage /> },
          { path: "clients/:clientId/edit", element: <ClientEditPage /> },
          { path: "products", element: <ProductsPage /> },
          { path: "products/new", element: <ProductNewPage /> },
          { path: "products/:productId", element: <ProductDetailPage /> },
          { path: "products/:productId/edit", element: <ProductEditPage /> },
          { path: "quotes", element: <QuotesPage /> },
          { path: "quotes/new", element: <QuoteNewPage /> },
          { path: "quotes/:quoteId", element: <QuoteDetailPage /> },
          { path: "quotes/:quoteId/edit", element: <QuoteEditPage /> },
          { path: "approvals", element: <ApprovalsPage /> },
          { path: "approvals/:approvalId", element: <ApprovalDetailPage /> },
          { path: "accounts", element: <AccountsPage /> },
          { path: "accounts/:clientId", element: <AccountDetailPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "orders/new", element: <OrderNewPage /> },
          { path: "orders/:orderId", element: <OrderDetailPage /> },
          { path: "orders/:orderId/edit", element: <OrderEditPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
