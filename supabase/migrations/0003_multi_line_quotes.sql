-- ===========================================================================
-- My Fab Estimator — multi-line quote builder schema
-- ===========================================================================
-- Adds: product_types (global), feature_library (per-company),
--       subcomponent_library (per-company), quotes (header), quote_items (line).
-- Idempotent.
-- Existing `estimates` table is left in place for now (legacy single-line).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- product_types — global catalogue of product templates
-- ---------------------------------------------------------------------------
create table if not exists public.product_types (
  code text primary key,
  name text not null,
  description text,
  sort_order integer not null default 100
);

insert into public.product_types (code, name, sort_order, description)
values
  ('worktop',         'Worktop',          10, 'Stainless steel worktop with optional downturns, sink bowls, cutouts.'),
  ('splashback',      'Splashback',       20, 'Wall splashback panel with optional cutouts and joining edges.'),
  ('wall_bench',      'Wall bench',       30, 'Stainless steel wall bench with optional undershelf, rear upstand.'),
  ('mobile_bench',    'Mobile centre bench', 40, 'Free-standing centre bench, often with castors and undershelf.'),
  ('work_bench',      'Work bench',       50, 'Heavy work bench with options for drawers, cupboards, undershelves.'),
  ('service_counter', 'Service counter',  60, 'Front-of-house service counter with optional refrigerated base.'),
  ('sink_unit',       'Sink unit',        70, 'Sink unit with one or more bowls, drainers, taps, upstand.'),
  ('wall_cupboard',   'Wall cupboard',    80, 'Wall-mounted cupboard with hinged or sliding doors.'),
  ('hot_cupboard',    'Hot cupboard',     90, 'Heated holding cupboard with sliding doors, fan-assisted option.'),
  ('wall_shelf',      'Wall shelf',      100, 'Single wall shelf.'),
  ('over_shelf',      'Over shelf',      110, 'Over-counter shelf, optionally quartz heated.'),
  ('rack',            'Storage rack',    120, 'Multi-tier storage rack.'),
  ('custom',          'Custom bespoke',  900, 'Bespoke unit not matching a template — estimator types description.'),
  ('free_text',       'Free text line',  990, 'Plain text line on the quote (e.g. project management, by others).'),
  ('bought_in',       'Bought-in equipment', 980, 'Supplier-supplied equipment with markup chain.'),
  ('delivery',        'Delivery',         970, 'Delivery line with optional tail-lift/install copy.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- feature_library — per-company optional add-ons (sink bowls, edges, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_library (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,                       -- e.g. SB400X400X300, ADE_LOCAL
  name text not null,                       -- "Sink bowl 400x400x300"
  applies_to text[] not null default '{}',  -- subset of product_types.code that can use this feature
  material_cost numeric not null default 0,
  labour_minutes numeric not null default 0,
  labour_rate_type text not null default 'fabrication',
  default_price numeric,                    -- override: if set, use this directly instead of mat+lab
  unit_basis text not null default 'per_item' check (unit_basis in ('per_item','per_metre','per_m2')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index if not exists idx_feature_lib_company on public.feature_library(company_id);

drop trigger if exists set_updated_at on public.feature_library;
create trigger set_updated_at
  before update on public.feature_library
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- subcomponent_library — per-company sub-parts that attach to products
-- (drawers, doors, panels, shelves, kick plates etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.subcomponent_library (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  applies_to text[] not null default '{}',
  size_label text,                          -- e.g. "1500", "900"
  material_cost numeric not null default 0,
  labour_minutes numeric not null default 0,
  labour_rate_type text not null default 'fabrication',
  default_price numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index if not exists idx_subcomp_lib_company on public.subcomponent_library(company_id);

drop trigger if exists set_updated_at on public.subcomponent_library;
create trigger set_updated_at
  before update on public.subcomponent_library
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- quotes — header record
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id),

  quote_reference text not null,            -- e.g. 0426-020
  revision_no text,
  status text not null default 'draft' check (status in ('draft','quoted','accepted','rejected','archived')),

  customer_name text,
  customer_company text,
  customer_email text,
  customer_account_ref text,

  project_name text,
  project_location text,
  prices_held_until date,
  payment_terms text,

  internal_notes text,
  prepared_by text,

  -- snapshot of costing matrix at calc time
  costing_snapshot jsonb,

  -- rolled-up totals (engine-computed)
  subtotal_ex_vat numeric not null default 0,
  vat_rate numeric not null default 20,
  vat_amount numeric not null default 0,
  total_inc_vat numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_reference)
);
create index if not exists idx_quotes_company on public.quotes(company_id);
create index if not exists idx_quotes_created on public.quotes(company_id, created_at desc);

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at
  before update on public.quotes
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_items — line items
-- ---------------------------------------------------------------------------
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,

  -- Order on the quote (1.010, 1.020, 1.030 etc.)
  position integer not null,
  item_no text,                              -- display number; auto-generated by app

  product_type text not null references public.product_types(code),
  item_reference text,                       -- internal stock code (CCE1-Fxxx) if applicable
  model_no text,                             -- internal model code (e.g. 16WT21X6)

  description text not null,                 -- customer-facing line description (auto-generated, editable)

  quantity numeric not null default 1,
  spec jsonb not null default '{}',          -- product-type-specific dimensions/options
  features jsonb not null default '[]',      -- array of { code, quantity? }
  subcomponents jsonb not null default '[]', -- array of { code, quantity? }

  -- Estimator overrides
  labour_hours_override numeric,             -- null means "use engine default"
  unit_price_override numeric,               -- null means "use calculated price"

  -- Engine-computed values
  calculated_breakdown jsonb,                -- material lines, labour lines, totals
  unit_price_ex_vat numeric not null default 0,
  line_total_ex_vat numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quote_items_quote on public.quote_items(quote_id);
create index if not exists idx_quote_items_position on public.quote_items(quote_id, position);

drop trigger if exists set_updated_at on public.quote_items;
create trigger set_updated_at
  before update on public.quote_items
  for each row execute function public.tg_set_updated_at();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.product_types         enable row level security;
alter table public.feature_library       enable row level security;
alter table public.subcomponent_library  enable row level security;
alter table public.quotes                enable row level security;
alter table public.quote_items           enable row level security;

-- product_types is a global reference table — everyone signed in can read.
drop policy if exists product_types_read on public.product_types;
create policy product_types_read on public.product_types
  for select using (auth.uid() is not null);

-- feature_library / subcomponent_library — per-company.
drop policy if exists feature_lib_select on public.feature_library;
create policy feature_lib_select on public.feature_library
  for select using (public.is_company_member(company_id));
drop policy if exists feature_lib_modify on public.feature_library;
create policy feature_lib_modify on public.feature_library
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

drop policy if exists subcomp_lib_select on public.subcomponent_library;
create policy subcomp_lib_select on public.subcomponent_library
  for select using (public.is_company_member(company_id));
drop policy if exists subcomp_lib_modify on public.subcomponent_library;
create policy subcomp_lib_modify on public.subcomponent_library
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- quotes — members of the company can read & write quotes.
drop policy if exists quotes_select on public.quotes;
create policy quotes_select on public.quotes
  for select using (public.is_company_member(company_id));
drop policy if exists quotes_modify on public.quotes;
create policy quotes_modify on public.quotes
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- quote_items — RLS via the parent quote's company_id.
drop policy if exists quote_items_select on public.quote_items;
create policy quote_items_select on public.quote_items
  for select using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and public.is_company_member(q.company_id)
    )
  );
drop policy if exists quote_items_modify on public.quote_items;
create policy quote_items_modify on public.quote_items
  for all using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and public.is_company_member(q.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and public.is_company_member(q.company_id)
    )
  );

-- ===========================================================================
-- Seed default feature library + subcomponent library for new companies
-- via SECURITY DEFINER helper (called by app when company is created)
-- ===========================================================================
create or replace function public.seed_default_library(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only owners of the company can seed (extra guard).
  if not public.is_company_owner(p_company) then
    raise exception 'Not authorised';
  end if;

  -- Features (defaults — CCE-derived values as starting point)
  insert into public.feature_library (company_id, code, name, applies_to, default_price, labour_minutes, unit_basis)
  values
    (p_company, 'SB235X335X180', 'Sink bowl 235×335×180', array['worktop','sink_unit'], 348, 30, 'per_item'),
    (p_company, 'SB330X330X200', 'Sink bowl 330×330×200', array['worktop','sink_unit'], 356, 30, 'per_item'),
    (p_company, 'SB400X400X300', 'Sink bowl 400×400×300', array['worktop','sink_unit'], 406, 35, 'per_item'),
    (p_company, 'SB500X400X300', 'Sink bowl 500×400×300', array['worktop','sink_unit'], 434, 40, 'per_item'),
    (p_company, 'SB760X500X370', 'Sink bowl 760×500×370', array['worktop','sink_unit'], 852, 60, 'per_item'),
    (p_company, 'ADE_LOCAL',     'Local anti-drip edge', array['worktop'], 240, 25, 'per_item'),
    (p_company, 'WELDED_JOIN',   'Welded join (between two tops)', array['worktop'], 210, 20, 'per_item'),
    (p_company, 'DROP_DOWN',     'Drop down section', array['worktop','service_counter'], 240, 20, 'per_item'),
    (p_company, 'CHAMFER',       'Chamfer', array['worktop','splashback'], 50, 5, 'per_item'),
    (p_company, 'SERVICE_PORT',  'Service port', array['worktop','wall_bench','work_bench'], 24, 5, 'per_item'),
    (p_company, 'CASTORS',       'Castors (set of 4)', array['mobile_bench','work_bench'], 84, 10, 'per_item'),
    (p_company, 'CHOPPING_BOARD','Chopping board 1/1 GN white', array['worktop','work_bench'], 132.50, 5, 'per_item'),
    (p_company, 'TAP_HOLE',      'Tap hole cutout', array['worktop','sink_unit'], 30, 5, 'per_item'),
    (p_company, 'SOCKET_CUTOUT', 'Socket cutout', array['splashback'], 25, 5, 'per_item'),
    (p_company, 'DRAINER_PLAIN', 'Plain drainer', array['worktop','sink_unit'], 180, 25, 'per_item'),
    (p_company, 'BIN_400',       'Bin 400×400×500', array['worktop','work_bench'], 460, 30, 'per_item'),
    (p_company, 'SPEED_RAIL_600','Speed rail 600 built-in', array['worktop','service_counter'], 250, 15, 'per_item'),
    (p_company, 'SPEED_RAIL_900','Speed rail 900 built-in', array['worktop','service_counter'], 350, 20, 'per_item'),
    (p_company, 'ICE_WELL_600',  'Ice well 600', array['service_counter'], 898, 60, 'per_item'),
    (p_company, 'ICE_WELL_1200', 'Ice well 1200', array['service_counter'], 1104, 80, 'per_item')
  on conflict (company_id, code) do nothing;

  -- Subcomponents
  insert into public.subcomponent_library (company_id, code, name, applies_to, size_label, default_price, labour_minutes)
  values
    (p_company, 'DRAWER_RECESSED',  'Drawer, recessed handle', array['wall_bench','work_bench','mobile_bench','service_counter'], '', 298, 30),
    (p_company, 'DRAWER_FOLDED',    'Drawer, integrally folded handle', array['wall_bench','work_bench','mobile_bench','service_counter'], '', 366, 35),
    (p_company, 'DRAWER_BANK_3',    'Bank of 3 drawers, recessed handles', array['wall_bench','work_bench','mobile_bench','service_counter'], '', 1114, 90),
    (p_company, 'DOOR_HINGED',      'Hinged door, recessed handle', array['wall_bench','work_bench','wall_cupboard','service_counter'], '', 174, 25),
    (p_company, 'DOOR_SLIDING',     'Sliding door, integrally folded', array['wall_cupboard','hot_cupboard','service_counter'], '', 242, 30),
    (p_company, 'DOOR_PASSTHROUGH', 'Pass-through pair of doors', array['wall_cupboard','hot_cupboard'], '', 196, 30),
    (p_company, 'REAR_PANEL_1200',  'Rear panel single skin 1200', array['wall_bench','work_bench','service_counter'], '1200', 172, 20),
    (p_company, 'REAR_PANEL_1500',  'Rear panel single skin 1500', array['wall_bench','work_bench','service_counter'], '1500', 172, 20),
    (p_company, 'REAR_PANEL_1800',  'Rear panel single skin 1800', array['wall_bench','work_bench','service_counter'], '1800', 172, 20),
    (p_company, 'REAR_PANEL_2100',  'Rear panel single skin 2100', array['wall_bench','work_bench','service_counter'], '2100', 242, 25),
    (p_company, 'REAR_PANEL_2400',  'Rear panel single skin 2400', array['wall_bench','work_bench','service_counter'], '2400', 242, 25),
    (p_company, 'END_PANEL_650',    'End panel double skinned 650', array['wall_bench','work_bench','service_counter'], '650', 188, 25),
    (p_company, 'END_PANEL_900',    'End panel double skinned 900', array['wall_bench','work_bench','service_counter'], '900', 188, 25),
    (p_company, 'END_FRAME_650',    'End frame 650', array['wall_bench','work_bench','service_counter'], '650', 86, 15),
    (p_company, 'END_FRAME_900',    'End frame 900', array['wall_bench','work_bench','service_counter'], '900', 86, 15),
    (p_company, 'SHELF_600',        'Shelf 600', array['wall_bench','work_bench','wall_shelf','over_shelf'], '600', 80, 15),
    (p_company, 'SHELF_900',        'Shelf 900', array['wall_bench','work_bench','wall_shelf','over_shelf'], '900', 96, 15),
    (p_company, 'SHELF_1200',       'Shelf 1200', array['wall_bench','work_bench','wall_shelf','over_shelf'], '1200', 114, 20),
    (p_company, 'SHELF_1500',       'Shelf 1500', array['wall_bench','work_bench','wall_shelf','over_shelf'], '1500', 132, 20),
    (p_company, 'SHELF_1800',       'Shelf 1800', array['wall_bench','work_bench','wall_shelf','over_shelf'], '1800', 152, 25),
    (p_company, 'SHELF_2100',       'Shelf 2100', array['wall_bench','work_bench','wall_shelf','over_shelf'], '2100', 170, 25),
    (p_company, 'SHELF_2400',       'Shelf 2400', array['wall_bench','work_bench','wall_shelf','over_shelf'], '2400', 186, 30),
    (p_company, 'UPSTAND_300',      'Upstand 300mm', array['worktop','wall_bench','work_bench','service_counter','sink_unit'], '300', 130, 15),
    (p_company, 'KICK_PLATE',       'Kick plate, standard screw fixed', array['wall_bench','work_bench','service_counter','sink_unit','wall_cupboard','hot_cupboard'], '', 54, 10)
  on conflict (company_id, code) do nothing;
end;
$$;

revoke all on function public.seed_default_library(uuid) from public;
grant execute on function public.seed_default_library(uuid) to authenticated;

-- ===========================================================================
-- Update create_company_with_owner to also seed the libraries
-- ===========================================================================
create or replace function public.create_company_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name) values (p_name) returning id into v_company_id;
  insert into public.company_users (company_id, user_id, role) values (v_company_id, v_user_id, 'owner');

  -- Seed the feature / subcomponent libraries
  perform public.seed_default_library(v_company_id);

  return v_company_id;
end;
$$;

-- ===========================================================================
-- Done.
-- ===========================================================================
