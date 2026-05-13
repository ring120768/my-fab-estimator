-- ===========================================================================
-- Equipment catalogue + supplier terms — per-company tables.
-- Catalogue items are per-company so each fabricator can edit/extend without
-- affecting others. Seeded from a master list (see 0008_seed_equipment_catalogue.sql).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- equipment_catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.equipment_catalogue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  manufacturer text not null,
  model text not null,
  description text,
  category text,                          -- optional grouping (fryers, fridges, etc.)
  list_price numeric,
  list_price_currency text not null default 'GBP',
  cost_notes text,
  -- Default supplier discount + markup for this item (overrides supplier_terms)
  default_supplier_discount_pct numeric,  -- 0-100, null = use supplier_terms
  default_markup_pct numeric,             -- 0-100, null = use company default
  -- Install labour hours (engineer / assistant / foreman) per item
  install_hours_eng numeric not null default 0,
  install_hours_asst numeric not null default 0,
  install_hours_foreman numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, manufacturer, model)
);
create index if not exists idx_eqcat_company on public.equipment_catalogue(company_id);
create index if not exists idx_eqcat_mfr on public.equipment_catalogue(company_id, manufacturer);
create index if not exists idx_eqcat_model on public.equipment_catalogue(company_id, model);

drop trigger if exists set_updated_at on public.equipment_catalogue;
create trigger set_updated_at
  before update on public.equipment_catalogue
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- supplier_terms — per-supplier discount + warranty defaults
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_terms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier text not null,
  equipment_category text,                -- optional — null means "all equipment"
  discount_pct numeric,                   -- 0-100
  warranty text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, supplier, equipment_category)
);
create index if not exists idx_supterms_company on public.supplier_terms(company_id);
create index if not exists idx_supterms_supplier on public.supplier_terms(company_id, supplier);

drop trigger if exists set_updated_at on public.supplier_terms;
create trigger set_updated_at
  before update on public.supplier_terms
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.equipment_catalogue enable row level security;
alter table public.supplier_terms enable row level security;

drop policy if exists eqcat_select on public.equipment_catalogue;
create policy eqcat_select on public.equipment_catalogue
  for select using (public.is_company_member(company_id));
drop policy if exists eqcat_modify on public.equipment_catalogue;
create policy eqcat_modify on public.equipment_catalogue
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

drop policy if exists supterms_select on public.supplier_terms;
create policy supterms_select on public.supplier_terms
  for select using (public.is_company_member(company_id));
drop policy if exists supterms_modify on public.supplier_terms;
create policy supterms_modify on public.supplier_terms
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));
