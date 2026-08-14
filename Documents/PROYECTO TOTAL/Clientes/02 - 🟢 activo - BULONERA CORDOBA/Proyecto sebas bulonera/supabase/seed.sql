insert into companies (id, legal_name, trade_name, tax_id, email, phone, status)
values ('00000000-0000-0000-0000-000000000001', 'Córdoba Bulones S.A.', 'Córdoba Bulones', '30-00000000-0', 'contacto@cordobabulones.example', '+54 351 000 0000', 'active')
on conflict (id) do nothing;

insert into branches (id, company_id, name, code, address, phone, email, status)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Sucursal Central',
  'CBA-CENTRAL',
  '{"street":"Av. Industria 100","city":"Córdoba","province":"Córdoba","country":"AR"}'::jsonb,
  '+54 351 000 1000',
  'central@cordobabulones.example',
  'active'
)
on conflict (id) do nothing;

insert into roles (code, name) values
  ('SUPER_ADMIN', 'Super administrador'),
  ('ADMIN', 'Administrador'),
  ('SALES_SUPERVISOR', 'Supervisor comercial'),
  ('SELLER', 'Vendedor'),
  ('CLIENT', 'Cliente'),
  ('WAREHOUSE', 'Depósito'),
  ('LOGISTICS', 'Logística')
on conflict (code) do nothing;

insert into permissions (code, name, group_code) values
  ('users.view', 'Ver usuarios', 'users'),
  ('users.create', 'Crear usuarios', 'users'),
  ('users.update', 'Editar usuarios', 'users'),
  ('users.delete', 'Eliminar usuarios', 'users'),
  ('clients.view', 'Ver clientes', 'clients'),
  ('clients.create', 'Crear clientes', 'clients'),
  ('clients.update', 'Editar clientes', 'clients'),
  ('clients.delete', 'Eliminar clientes', 'clients'),
  ('products.view', 'Ver productos', 'products'),
  ('products.create', 'Crear productos', 'products'),
  ('products.update', 'Editar productos', 'products'),
  ('products.delete', 'Eliminar productos', 'products'),
  ('quotes.view', 'Ver cotizaciones', 'quotes'),
  ('quotes.create', 'Crear cotizaciones', 'quotes'),
  ('quotes.update', 'Editar cotizaciones', 'quotes'),
  ('quotes.convert', 'Convertir cotizaciones', 'quotes'),
  ('orders.view', 'Ver pedidos', 'orders'),
  ('orders.create', 'Crear pedidos', 'orders'),
  ('orders.update', 'Editar pedidos', 'orders'),
  ('orders.approve', 'Aprobar pedidos', 'orders'),
  ('orders.cancel', 'Cancelar pedidos', 'orders'),
  ('dispatch.view', 'Ver despacho', 'dispatch'),
  ('dispatch.create', 'Crear despacho', 'dispatch'),
  ('dispatch.update', 'Editar despacho', 'dispatch'),
  ('discounts.apply', 'Aplicar descuentos', 'discounts'),
  ('discounts.override', 'Sobrescribir descuentos', 'discounts'),
  ('approvals.view', 'Ver autorizaciones', 'approvals'),
  ('approvals.approve', 'Aprobar autorizaciones', 'approvals'),
  ('approvals.reject', 'Rechazar autorizaciones', 'approvals'),
  ('approvals.cancel', 'Cancelar autorizaciones', 'approvals'),
  ('approvals.comment', 'Comentar autorizaciones', 'approvals'),
  ('reports.view', 'Ver reportes', 'reports'),
  ('audit.view', 'Ver auditoría', 'audit'),
  ('tango.sync', 'Sincronizar Tango', 'tango'),
  ('settings.manage', 'Gestionar configuración', 'settings')
on conflict (code) do nothing;

insert into role_permissions (role_code, permission_code)
select r.code, p.code
from roles r
cross join permissions p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

insert into role_permissions (role_code, permission_code)
select r.code, p.code
from roles r
join permissions p on p.code in (
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'clients.view',
  'clients.create',
  'clients.update',
  'clients.delete',
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'quotes.view',
  'quotes.create',
  'quotes.update',
  'quotes.convert',
  'orders.view',
  'orders.create',
  'orders.update',
  'orders.approve',
  'orders.cancel',
  'dispatch.view',
  'dispatch.create',
  'dispatch.update',
  'discounts.apply',
  'discounts.override',
  'approvals.view',
  'approvals.approve',
  'approvals.reject',
  'approvals.cancel',
  'approvals.comment',
  'reports.view',
  'audit.view',
  'settings.manage'
)
where r.code = 'ADMIN'
on conflict do nothing;

insert into product_families (id, company_id, code, name, status)
values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', 'FER', 'Ferretería', 'active'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000001', 'TOR', 'Tornillería', 'active')
on conflict (company_id, code) do nothing;

insert into product_lines (id, company_id, family_id, code, name, status)
values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001001', 'FER-GEN', 'General', 'active'),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001002', 'TOR-MET', 'Metales', 'active')
on conflict (company_id, code) do nothing;

insert into price_lists (id, company_id, code, name, currency, status)
values
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000001', 'LISTA-GEN', 'Lista general', 'ARS', 'active')
on conflict (company_id, code) do nothing;

-- Los usuarios Auth deben crearse desde Supabase Auth o por un flujo controlado.
-- Luego se pueden insertar perfiles y user_roles vinculados a auth.users(id).
