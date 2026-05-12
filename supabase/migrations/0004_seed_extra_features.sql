-- ===========================================================================
-- Extra features and subcomponents from the expanded Q4-2025 → Q2-2026 sample.
-- Run once. Safe to re-run (on conflict do nothing).
-- ===========================================================================

do $$
declare
  c record;
begin
  for c in select id from public.companies loop

    -- Additional FEATURES seen frequently across 551 quote sheets
    insert into public.feature_library (company_id, code, name, applies_to, default_price, labour_minutes, unit_basis) values
      (c.id, 'VALANCE',           'Valance (vented for compressor)', array['service_counter','sink_unit','wall_bench','work_bench'], 102, 15, 'per_item'),
      (c.id, 'SB600X450X300',     'Sink bowl 600×450×300', array['worktop','sink_unit'], 494, 45, 'per_item'),
      (c.id, 'BASKET_RUNNERS',    'Basket runners', array['worktop','sink_unit','work_bench'], 150, 15, 'per_item'),
      (c.id, 'COLUMN_CUTOUT',     'Column cutout', array['worktop','wall_bench','work_bench'], 88, 10, 'per_item'),
      (c.id, 'TRIVET_400',        'Trivet perforated 400×400', array['worktop','wall_bench'], 176, 15, 'per_item'),
      (c.id, 'BIN_PULL_OUT',      'Bin pull-out section', array['worktop','work_bench','wall_bench'], 384, 30, 'per_item'),
      (c.id, 'BIN_FLAP',          'Bin flap', array['worktop','work_bench','wall_bench'], 190, 15, 'per_item'),
      (c.id, 'LOCK',              'Lock', array['wall_cupboard','hot_cupboard','work_bench','wall_bench'], 64, 10, 'per_item'),
      (c.id, 'SINK_STRAINER',     'Bespoke sink strainer unit', array['sink_unit'], 978.50, 60, 'per_item'),
      (c.id, 'SOCKET_SSO',        'Socket standard SSO (cutout + plate)', array['splashback','wall_bench'], 56, 10, 'per_item'),
      (c.id, 'SOCKET_DSSO_IP',    'Socket IP Rated DSSO', array['splashback','wall_bench'], 108, 15, 'per_item'),
      (c.id, 'SOCKET_SSO_IP',     'Socket IP Rated SSO', array['splashback','wall_bench'], 66, 10, 'per_item'),
      (c.id, 'WASTE_CHUTE',       'Stainless waste chute welded in', array['worktop','sink_unit'], 74, 10, 'per_item'),
      (c.id, 'TUNDISH',           'Tundish', array['sink_unit','worktop'], 160, 15, 'per_item'),
      (c.id, 'ICE_WELL_900',      'Ice well 900', array['service_counter'], 1000, 70, 'per_item')
    on conflict (company_id, code) do nothing;

    -- Additional SUBCOMPONENTS
    insert into public.subcomponent_library (company_id, code, name, applies_to, size_label, default_price, labour_minutes) values
      (c.id, 'TOP_14SWG',         '14swg (2.0mm) heavy worktop spec', array['worktop','wall_bench','work_bench'], '', 24, 5),
      (c.id, 'PANEL_850X600',     'Stainless steel panel 850×600', array['wall_bench','work_bench','wall_cupboard'], '850x600', 108, 15),
      (c.id, 'SHELF_300',         'Shelf 300', array['wall_bench','work_bench','wall_shelf','over_shelf'], '300', 60, 10),
      (c.id, 'SHELF_ADJ_LADDER',  'Centre shelf, adjustable on ladder racking', array['wall_bench','work_bench','wall_cupboard'], '', 104, 25),
      (c.id, 'UPSTAND_150_BOXED', 'Upstand 150mm fully boxed', array['worktop','wall_bench','work_bench','sink_unit'], '150', 94, 15),
      (c.id, 'MCB_3PH',           '3-phase MCB consumer unit (premium)', array['service_counter','hot_cupboard'], '', 2310, 90)
    on conflict (company_id, code) do nothing;

  end loop;
end $$;
