-- ===========================================================================
-- More product types and features uncovered by the 646-quote analysis.
-- ===========================================================================

-- New product types
insert into public.product_types (code, name, sort_order, description) values
  ('dishwash_table',   'Dishwash table',    65, 'Inlet/outlet table for dishwashers. Often has anti-drip gulley + 600×450 sink bowl.'),
  ('pot_shelf',        'Pot shelf',        105, 'Rodded wall-mounted shelf for hanging pots.'),
  ('basket_shelf',     'Basket shelf',     106, 'Angled wall-mounted shelf for storing dishwash baskets vertically.'),
  ('drip_tray',        'Drip tray',        107, 'Long thin stainless drip tray with perforated inserts.'),
  ('storage_cupboard', 'Storage cupboard',  85, 'Under-counter or freestanding storage cupboard, often lockable.'),
  ('rack',             'Storage rack',     115, 'Multi-tier storage rack with adjustable shelves.'),
  ('island_counter',   'Island counter',    65, 'Free-standing island unit, often for service or display.')
on conflict (code) do update set
  name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- More features
do $$
declare c record;
begin
  for c in select id from public.companies loop
    insert into public.feature_library (company_id, code, name, applies_to, default_price, labour_minutes, unit_basis) values
      (c.id, 'MATERIALS_GENERAL', 'Materials general (PC sum)', array['worktop','wall_bench','work_bench','mobile_bench','service_counter','sink_unit','dishwash_table','hot_cupboard','wall_cupboard','storage_cupboard','wall_shelf','over_shelf','splashback','rack','island_counter','custom'], 244, 0, 'per_item'),
      (c.id, 'SUNDRIES',          'Sundries allowance',           array['worktop','wall_bench','work_bench','mobile_bench','service_counter','sink_unit','dishwash_table','hot_cupboard','wall_cupboard','storage_cupboard','wall_shelf','over_shelf','splashback','rack','island_counter','custom'], 50, 0, 'per_item'),
      (c.id, 'COMMANDO_SOCKET',   'Commando plug and socket',     array['splashback','wall_shelf','wall_bench','work_bench'], 120, 15, 'per_item'),
      (c.id, 'HANDLE_FOLDED',     'Integrally folded handle',     array['wall_cupboard','hot_cupboard','storage_cupboard','wall_bench','work_bench'], 56, 10, 'per_item'),
      (c.id, 'WASTE_HOLE',        'Waste hole / outlet',          array['worktop','sink_unit','dishwash_table'], 90, 15, 'per_item'),
      (c.id, 'RISER_SUPPORTS',    'Riser style supports (single)',array['splashback','over_shelf'], 80, 15, 'per_item'),
      (c.id, 'INFRA_RED_HEATER',  'Infra-red heater (over-shelf)',array['over_shelf'], 540, 25, 'per_item'),
      (c.id, 'PERFORATED_INSERT', 'Perforated insert (drip tray)',array['drip_tray','sink_unit'], 80, 10, 'per_item')
    on conflict (company_id, code) do nothing;

    -- More upstand sizes (these are dimensions of the bench, but quoted as sub-components)
    insert into public.subcomponent_library (company_id, code, name, applies_to, size_label, default_price, labour_minutes) values
      (c.id, 'UPSTAND_50',  'Upstand 50mm (rear / end)', array['worktop','wall_bench','work_bench','sink_unit','mobile_bench','service_counter'], '50', 60, 10),
      (c.id, 'UPSTAND_100', 'Upstand 100mm shaped',      array['worktop','wall_bench','service_counter','sink_unit'], '100', 90, 12),
      (c.id, 'UPSTAND_400', 'Tap deck upstand 400mm',    array['splashback','sink_unit'], '400', 150, 20),
      (c.id, 'PANEL_LAMINATE','Laminate boards slotted panel', array['mobile_bench','service_counter','wall_bench','work_bench'], '', 118, 20)
    on conflict (company_id, code) do nothing;
  end loop;
end $$;
