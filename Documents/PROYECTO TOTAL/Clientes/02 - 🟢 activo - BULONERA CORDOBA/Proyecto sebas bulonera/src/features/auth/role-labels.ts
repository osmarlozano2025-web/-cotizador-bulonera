import { ROLES, type Role } from "./roles";

export function getRoleLabel(role: Role): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "Super administrador";
    case ROLES.ADMIN:
      return "Administrador";
    case ROLES.SALES_SUPERVISOR:
      return "Supervisor comercial";
    case ROLES.SELLER:
      return "Vendedor";
    case ROLES.CLIENT:
      return "Cliente";
    case ROLES.WAREHOUSE:
      return "Depósito";
    case ROLES.LOGISTICS:
      return "Logística";
  }
}
