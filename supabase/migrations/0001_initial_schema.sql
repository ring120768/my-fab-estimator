-- ===========================================================================
-- My Fab Estimator — initial schema migration
-- ===========================================================================
-- Idempotent: safe to re-run. Drops nothing.
-- Tables: companies, company_users, labour_rates, material_rates,
--         process_rates, costing_rules, quote_settings, estimates.
-- Each company-owned table has company_id + RLS scoped to membership.
-- ===========================================================================

-- pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  email text,
  phone text,
  vat_registered boolean not null default false,
  vat_rate numeric not null default 20,
  currency text not null default 'GBP',
  default_quote_validity_days integer not null default 30,
  default_lead_time_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.companies;
create trigger set_updated_at
  before update on public.companies
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- company_users — links auth.users to companies with a role
-- ---------------------------------------------------------------------------
create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','estimator')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_users_user on public.company_users(user_id);
create index if not exists idx_company_users_company on public.company_users(company_id);

-- ---------------------------------------------------------------------------
-- Helper function: is the current auth user a member of a given company?
-- security definer so RLS can call it freely without recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_company_member(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_users
    where company_id = p_company and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_owner(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_users
    where company_id = p_company and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- labour_rates
-- ---------------------------------------------------------------------------
create table if not exists public.labour_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rate_type text not null check (rate_type in ('fabrication','welding','polishing','cad','installation')),
  hourly_rate numeric not null,
  minimum_hours numeric not null default 0,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, rate_type)
);
create index if not exists idx_labour_company on public.labour_rates(company_id);

drop trigger if exists set_updated_at on public.labour_rates;
create trigger set_updated_at
  before update on public.labour_rates
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- material_rates
-- ---------------------------------------------------------------------------
create table if not exists public.material_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null check (category in ('sheet','box_section','tube','angle','flat_bar','feet','hinges','handles','locks','runners','fixings','consumables')),
  name text,
  grade text,
  size_label text,
  thickness_mm numeric,
  unit text not null check (unit in ('m2','metre','each','sheet')),
  unit_cost numeric not null,
  supplier_name text,
  stale_after_days integer not null default 30,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_material_company on public.material_rates(company_id);
create index if not exists idx_material_category on public.material_rates(company_id, category);

drop trigger if exists set_updated_at on public.material_rates;
create trigger set_updated_at
  before update on public.material_rates
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- process_rates
-- ---------------------------------------------------------------------------
create table if not exists public.process_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  process_name text not null check (process_name in ('cutting','folding','welding','polishing','drilling','assembly','packing','qa')),
  basis text not null check (basis in ('per_item','per_metre','per_fold','per_m2','per_hour')),
  time_minutes numeric not null,
  minimum_minutes numeric not null default 0,
  labour_rate_type text not null check (labour_rate_type in ('fabrication','welding','polishing','cad','installation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, process_name)
);
create index if not exists idx_process_company on public.process_rates(company_id);

drop trigger if exists set_updated_at on public.process_rates;
create trigger set_updated_at
  before update on public.process_rates
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- costing_rules — one row per company
-- ---------------------------------------------------------------------------
create table if not exists public.costing_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  standard_waste_percentage numeric not null default 10,
  bespoke_waste_percentage numeric not null default 20,
  consumables_percentage numeric not null default 3,
  overhead_percentage numeric not null default 0,
  pricing_method text not null default 'margin' check (pricing_method in ('margin','markup')),
  default_margin_percentage numeric not null default 30,
  minimum_margin_percentage numeric not null default 20,
  minimum_order_value numeric not null default 0,
  rounding_enabled boolean not null default true,
  rounding_unit numeric not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.costing_rules;
create trigger set_updated_at
  before update on public.costing_rules
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_settings — one row per company
-- ---------------------------------------------------------------------------
create table if not exists public.quote_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  quote_prefix text not null default 'Q',
  next_quote_number integer not null default 1,
  terms_text text,
  exclusions_default text,
  validity_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.quote_settings;
create trigger set_updated_at
  before update on public.quote_settings
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- estimates
-- ---------------------------------------------------------------------------
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  quote_reference text not null,
  customer_name text,
  customer_email text,
  project_name text,
  product_type text not null,
  status text not null default 'draft' check (status in ('draft','quoted','accepted','rejected','archived')),
  input_data jsonb not null,
  cost_breakdown jsonb not null,
  costing_snapshot jsonb not null,
  assumptions text[] not null default '{}',
  exclusions text[] not null default '{}',
  missing_information text[] not null default '{}',
  internal_notes text,
  sell_price_ex_vat numeric,
  vat_amount numeric,
  total_price_inc_vat numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_reference)
);
create index if not exists idx_estimates_company on public.estimates(company_id);
create index if not exists idx_estimates_created_at on public.estimates(company_id, created_at desc);

drop trigger if exists set_updated_at on public.estimates;
create trigger set_updated_at
  before update on public.estimates
  for each row execute function public.tg_set_updated_at();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.companies        enable row level security;
alter table public.company_users    enable row level security;
alter table public.labour_rates     enable row level security;
alter table public.material_rates   enable row level security;
alter table public.process_rates    enable row level security;
alter table public.costing_rules    enable row level security;
alter table public.quote_settings   enable row level security;
alter table public.estimates        enable row level security;

-- companies: members can read; only owners can update.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (public.is_company_member(id));

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert with check (auth.uid() is not null);
  -- After insert, app must immediately add the creator to company_users with role='owner'.

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update using (public.is_company_owner(id))
  with check (public.is_company_owner(id));

-- company_users:
--   - User can see their own membership rows.
--   - Owners can see all members of their company.
--   - Owners can add/remove members; anyone can insert their own first owner row
--     when bootstrapping (right after creating a company).
drop policy if exists company_users_select_self on public.company_users;
create policy company_users_select_self on public.company_users
  for select using (
    user_id = auth.uid() or public.is_company_owner(company_id)
  );

drop policy if exists company_users_insert_bootstrap on public.company_users;
create policy company_users_insert_bootstrap on public.company_users
  for insert with check (
    -- Allow inserting your own owner row if no rows exist for that company,
    -- OR an existing owner is adding someone.
    (user_id = auth.uid() and role = 'owner'
       and not exists (select 1 from public.company_users cu where cu.company_id = company_users.company_id))
    or public.is_company_owner(company_id)
  );

drop policy if exists company_users_delete on public.company_users;
create policy company_users_delete on public.company_users
  for delete using (public.is_company_owner(company_id));

-- ---------------------------------------------------------------------------
-- Generic per-company-table RLS: anyone in the company can read; owners can
-- write. (We keep estimator-write open too via is_company_member for now;
-- tighten to owner-only later if needed.)
-- ---------------------------------------------------------------------------
-- labour_rates
drop policy if exists labour_select on public.labour_rates;
create policy labour_select on public.labour_rates
  for select using (public.is_company_member(company_id));
drop policy if exists labour_modify on public.labour_rates;
create policy labour_modify on public.labour_rates
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- material_rates
drop policy if exists material_select on public.material_rates;
create policy material_select on public.material_rates
  for select using (public.is_company_member(company_id));
drop policy if exists material_modify on public.material_rates;
create policy material_modify on public.material_rates
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- process_rates
drop policy if exists process_select on public.process_rates;
create policy process_select on public.process_rates
  for select using (public.is_company_member(company_id));
drop policy if exists process_modify on public.process_rates;
create policy process_modify on public.process_rates
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- costing_rules
drop policy if exists rules_select on public.costing_rules;
create policy rules_select on public.costing_rules
  for select using (public.is_company_member(company_id));
drop policy if exists rules_modify on public.costing_rules;
create policy rules_modify on public.costing_rules
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- quote_settings
drop policy if exists quote_settings_select on public.quote_settings;
create policy quote_settings_select on public.quote_settings
  for select using (public.is_company_member(company_id));
drop policy if exists quote_settings_modify on public.quote_settings;
create policy quote_settings_modify on public.quote_settings
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- estimates: any member can read/write estimates for their company.
drop policy if exists estimates_select on public.estimates;
create policy estimates_select on public.estimates
  for select using (public.is_company_member(company_id));
drop policy if exists estimates_modify on public.estimates;
create policy estimates_modify on public.estimates
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- ===========================================================================
-- Done.
-- ===========================================================================
