create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  tax_id text not null,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text not null,
  address jsonb,
  phone text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  group_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_code text not null references roles(code) on delete cascade,
  permission_code text not null references permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_code, permission_code)
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null references roles(code) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role_code, company_id)
);

create table if not exists client_sellers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  code text not null,
  name text not null,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  assigned_seller_id uuid references client_sellers(id) on delete set null,
  code text not null,
  legal_name text not null,
  trade_name text,
  tax_id text not null,
  email text,
  phone text,
  contact_name text,
  price_list_id uuid,
  general_discount_percentage numeric not null default 0,
  credit_limit numeric not null default 0,
  commercial_status text not null default 'active',
  account_status text not null default 'current',
  payment_condition text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (company_id, tax_id)
);

create table if not exists client_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  street text not null,
  number text,
  city text not null,
  province text not null,
  postal_code text,
  country text not null default 'AR',
  reference text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_families (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists product_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  family_id uuid not null references product_families(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists price_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  currency text not null default 'ARS',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  internal_code text not null,
  tango_code text,
  name text not null,
  description text,
  family_id uuid not null references product_families(id),
  line_id uuid references product_lines(id) on delete set null,
  brand text,
  measure text,
  unit_of_measure text not null,
  base_price numeric not null default 0,
  stock_quantity numeric not null default 0,
  minimum_stock numeric,
  image_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, internal_code)
);

create table if not exists product_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  price_list_id uuid not null references price_lists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, product_id)
);

create table if not exists discount_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  scope text not null,
  scope_id uuid,
  percentage numeric not null default 0,
  priority integer not null default 0,
  valid_from date not null,
  valid_to date,
  requires_approval boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists seller_discount_limits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  seller_id uuid not null references client_sellers(id) on delete cascade,
  maximum_percentage numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id)
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  seller_id uuid references client_sellers(id) on delete set null,
  number text not null,
  status text not null default 'draft',
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'ARS',
  valid_until date not null,
  notes text,
  commercial_conditions text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid not null references products(id),
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  discount_percentage numeric not null default 0,
  discount_amount numeric not null default 0,
  line_total numeric not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  seller_id uuid references client_sellers(id) on delete set null,
  source_quote_id uuid references quotes(id) on delete set null,
  number text not null,
  status text not null default 'draft',
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'ARS',
  payment_condition text,
  delivery_address_id uuid,
  notes text,
  requires_approval boolean not null default false,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  discount_percentage numeric not null default 0,
  discount_amount numeric not null default 0,
  line_total numeric not null default 0
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  type text not null,
  status text not null default 'pending',
  requested_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  seller_id uuid references client_sellers(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  requested_value numeric,
  authorized_value numeric,
  reason text not null,
  resolution_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approval_events (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references approval_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null,
  previous_status text,
  new_status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists account_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  document_number text not null,
  description text not null,
  issue_date date not null,
  due_date date,
  debit_amount numeric not null default 0,
  credit_amount numeric not null default 0,
  balance_after numeric not null default 0,
  currency text not null default 'ARS',
  status text not null default 'pending',
  related_order_id uuid references orders(id) on delete set null,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dispatch_guides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  number text not null,
  client_id uuid not null references clients(id) on delete cascade,
  delivery_address_id uuid not null,
  status text not null default 'pending',
  package_count integer,
  total_weight numeric,
  driver_id uuid,
  vehicle_id uuid,
  delivery_zone_id uuid,
  scheduled_date date,
  scheduled_time_range text,
  observations text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);

create table if not exists dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_guide_id uuid not null references dispatch_guides(id) on delete cascade,
  product_id uuid not null references products(id),
  code text not null,
  description text not null,
  prepared_quantity numeric not null default 0,
  unit_of_measure text not null,
  package_reference text,
  observations text
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  dispatch_guide_id uuid not null references dispatch_guides(id) on delete cascade,
  status text not null default 'pending',
  delivered_at timestamptz,
  received_by text,
  receiver_document text,
  failure_reason text,
  rescheduled_date date,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  code text not null,
  plate text not null,
  description text not null,
  capacity numeric,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  description text,
  localities text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists logistics_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists missing_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  dispatch_guide_id uuid references dispatch_guides(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  product_id uuid not null references products(id),
  requested_quantity numeric not null default 0,
  prepared_quantity numeric not null default 0,
  missing_quantity numeric not null default 0,
  reason text not null,
  notes text,
  resolution_status text not null default 'pending',
  reported_by uuid not null references auth.users(id),
  reported_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  status text not null default 'unread',
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists integration_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  integration_key text not null unique,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tango_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  external_reference text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists tango_sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid references tango_sync_jobs(id) on delete set null,
  level text not null default 'info',
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_company_id on profiles(company_id);
create index if not exists idx_profiles_branch_id on profiles(branch_id);
create index if not exists idx_clients_company_branch on clients(company_id, branch_id);
create index if not exists idx_clients_code on clients(company_id, code);
create index if not exists idx_products_company_branch on products(company_id, branch_id);
create index if not exists idx_quotes_client_id on quotes(client_id);
create index if not exists idx_quotes_seller_id on quotes(seller_id);
create index if not exists idx_quotes_status on quotes(status);
create index if not exists idx_quotes_created_at on quotes(created_at);
create index if not exists idx_orders_client_id on orders(client_id);
create index if not exists idx_orders_seller_id on orders(seller_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_source_quote_id on orders(source_quote_id);
create index if not exists idx_orders_created_at on orders(created_at);
create index if not exists idx_approval_requests_client_id on approval_requests(client_id);
create index if not exists idx_approval_requests_status on approval_requests(status);
create index if not exists idx_account_movements_client_id on account_movements(client_id);
create index if not exists idx_account_movements_status on account_movements(status);
create index if not exists idx_dispatch_guides_order_id on dispatch_guides(order_id);
create index if not exists idx_dispatch_guides_client_id on dispatch_guides(client_id);
create index if not exists idx_notifications_user_id on notifications(user_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function get_current_profile()
returns profiles
language sql
security definer
set search_path = public
as $$
  select *
  from profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function get_current_company_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select company_id
  from profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function has_role(role_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and user_roles.role_code = role_code
  );
$$;

create or replace function has_permission(permission_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles
    join role_permissions on role_permissions.role_code = user_roles.role_code
    where user_roles.user_id = auth.uid()
      and role_permissions.permission_code = permission_code
  );
$$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_touch_updated_at before update on companies for each row execute function touch_updated_at();
create trigger branches_touch_updated_at before update on branches for each row execute function touch_updated_at();
create trigger profiles_touch_updated_at before update on profiles for each row execute function touch_updated_at();
create trigger roles_touch_updated_at before update on roles for each row execute function touch_updated_at();
create trigger permissions_touch_updated_at before update on permissions for each row execute function touch_updated_at();
create trigger clients_touch_updated_at before update on clients for each row execute function touch_updated_at();
create trigger client_addresses_touch_updated_at before update on client_addresses for each row execute function touch_updated_at();
create trigger product_families_touch_updated_at before update on product_families for each row execute function touch_updated_at();
create trigger product_lines_touch_updated_at before update on product_lines for each row execute function touch_updated_at();
create trigger price_lists_touch_updated_at before update on price_lists for each row execute function touch_updated_at();
create trigger products_touch_updated_at before update on products for each row execute function touch_updated_at();
create trigger product_prices_touch_updated_at before update on product_prices for each row execute function touch_updated_at();
create trigger discount_rules_touch_updated_at before update on discount_rules for each row execute function touch_updated_at();
create trigger seller_discount_limits_touch_updated_at before update on seller_discount_limits for each row execute function touch_updated_at();
create trigger quotes_touch_updated_at before update on quotes for each row execute function touch_updated_at();
create trigger orders_touch_updated_at before update on orders for each row execute function touch_updated_at();
create trigger approval_requests_touch_updated_at before update on approval_requests for each row execute function touch_updated_at();
create trigger account_movements_touch_updated_at before update on account_movements for each row execute function touch_updated_at();
create trigger dispatch_guides_touch_updated_at before update on dispatch_guides for each row execute function touch_updated_at();
create trigger deliveries_touch_updated_at before update on deliveries for each row execute function touch_updated_at();
create trigger drivers_touch_updated_at before update on drivers for each row execute function touch_updated_at();
create trigger vehicles_touch_updated_at before update on vehicles for each row execute function touch_updated_at();
create trigger delivery_zones_touch_updated_at before update on delivery_zones for each row execute function touch_updated_at();
create trigger integration_settings_touch_updated_at before update on integration_settings for each row execute function touch_updated_at();
create trigger tango_sync_jobs_touch_updated_at before update on tango_sync_jobs for each row execute function touch_updated_at();

alter table companies enable row level security;
alter table branches enable row level security;
alter table profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table clients enable row level security;
alter table client_addresses enable row level security;
alter table client_sellers enable row level security;
alter table products enable row level security;
alter table product_families enable row level security;
alter table product_lines enable row level security;
alter table price_lists enable row level security;
alter table product_prices enable row level security;
alter table discount_rules enable row level security;
alter table seller_discount_limits enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table approval_requests enable row level security;
alter table approval_events enable row level security;
alter table account_movements enable row level security;
alter table dispatch_guides enable row level security;
alter table dispatch_items enable row level security;
alter table deliveries enable row level security;
alter table drivers enable row level security;
alter table vehicles enable row level security;
alter table delivery_zones enable row level security;
alter table logistics_events enable row level security;
alter table missing_items enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table integration_settings enable row level security;
alter table tango_sync_jobs enable row level security;
alter table tango_sync_logs enable row level security;

create policy "profiles_self_or_company" on profiles for select using (id = auth.uid() or company_id = get_current_company_id());
create policy "companies_company_scope" on companies for select using (id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "clients_company_scope" on clients for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "quotes_company_scope" on quotes for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "orders_company_scope" on orders for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "account_movements_company_scope" on account_movements for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "approval_requests_company_scope" on approval_requests for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "dispatch_guides_company_scope" on dispatch_guides for all using (company_id = get_current_company_id() or has_role('SUPER_ADMIN')) with check (company_id = get_current_company_id() or has_role('SUPER_ADMIN'));
create policy "notifications_self" on notifications for select using (user_id = auth.uid());
create policy "audit_logs_admin_only" on audit_logs for select using (has_role('SUPER_ADMIN') or has_role('ADMIN'));
