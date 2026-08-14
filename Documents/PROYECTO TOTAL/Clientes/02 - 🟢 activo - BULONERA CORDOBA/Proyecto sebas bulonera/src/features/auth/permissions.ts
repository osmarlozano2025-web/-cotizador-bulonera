export const PERMISSIONS = {
  USERS_VIEW: "users.view", USERS_CREATE: "users.create", USERS_UPDATE: "users.update", USERS_DELETE: "users.delete",
  CLIENTS_VIEW: "clients.view", CLIENTS_CREATE: "clients.create", CLIENTS_UPDATE: "clients.update", CLIENTS_DELETE: "clients.delete",
  PRODUCTS_VIEW: "products.view", PRODUCTS_CREATE: "products.create", PRODUCTS_UPDATE: "products.update", PRODUCTS_DELETE: "products.delete",
  QUOTES_VIEW: "quotes.view", QUOTES_CREATE: "quotes.create", QUOTES_UPDATE: "quotes.update", QUOTES_CONVERT: "quotes.convert",
  ORDERS_VIEW: "orders.view", ORDERS_CREATE: "orders.create", ORDERS_UPDATE: "orders.update", ORDERS_APPROVE: "orders.approve", ORDERS_CANCEL: "orders.cancel",
  DISPATCH_VIEW: "dispatch.view", DISPATCH_CREATE: "dispatch.create", DISPATCH_UPDATE: "dispatch.update",
  DISCOUNTS_APPLY: "discounts.apply", DISCOUNTS_OVERRIDE: "discounts.override",
  APPROVALS_VIEW: "approvals.view", APPROVALS_APPROVE: "approvals.approve", APPROVALS_REJECT: "approvals.reject", APPROVALS_CANCEL: "approvals.cancel", APPROVALS_COMMENT: "approvals.comment",
  REPORTS_VIEW: "reports.view", AUDIT_VIEW: "audit.view", TANGO_SYNC: "tango.sync", SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type ViewPermission = Extract<Permission, `${string}.view`>;
export type EditPermission = Extract<Permission, `${string}.create` | `${string}.update` | `${string}.apply` | `${string}.override` | `${string}.convert` | `${string}.approve` | `${string}.cancel` | `${string}.manage` | `${string}.sync`>;
export type DeletePermission = Extract<Permission, `${string}.delete`>;

export const PERMISSION_LIST: readonly Permission[] = Object.freeze(Object.values(PERMISSIONS));

export const PERMISSION_GROUPS = {
  users: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE],
  clients: [PERMISSIONS.CLIENTS_VIEW, PERMISSIONS.CLIENTS_CREATE, PERMISSIONS.CLIENTS_UPDATE, PERMISSIONS.CLIENTS_DELETE],
  products: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE, PERMISSIONS.PRODUCTS_DELETE],
  quotes: [PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_UPDATE, PERMISSIONS.QUOTES_CONVERT],
  orders: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_UPDATE, PERMISSIONS.ORDERS_APPROVE, PERMISSIONS.ORDERS_CANCEL],
  dispatch: [PERMISSIONS.DISPATCH_VIEW, PERMISSIONS.DISPATCH_CREATE, PERMISSIONS.DISPATCH_UPDATE],
  discounts: [PERMISSIONS.DISCOUNTS_APPLY, PERMISSIONS.DISCOUNTS_OVERRIDE],
  approvals: [PERMISSIONS.APPROVALS_VIEW, PERMISSIONS.APPROVALS_APPROVE, PERMISSIONS.APPROVALS_REJECT, PERMISSIONS.APPROVALS_CANCEL, PERMISSIONS.APPROVALS_COMMENT],
  reports: [PERMISSIONS.REPORTS_VIEW], audit: [PERMISSIONS.AUDIT_VIEW], tango: [PERMISSIONS.TANGO_SYNC], settings: [PERMISSIONS.SETTINGS_MANAGE],
} as const satisfies Readonly<Record<string, readonly Permission[]>>;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;
