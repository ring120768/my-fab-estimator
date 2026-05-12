-- ===========================================================================
-- Common bench shelves: base shelf and mid shelves by fixing type.
-- These describe the *position and fixing* on a bench; size is taken from
-- the parent product's length when the pricing engine renders the line.
-- ===========================================================================

do $$
declare
  c record;
begin
  for c in select id from public.companies loop

    insert into public.subcomponent_library (company_id, code, name, applies_to, size_label, default_price, labour_minutes) values
      (c.id, 'BENCH_BASE_SHELF_FIXED',
        'Fixed base shelf (welded, full length)',
        array['wall_bench','work_bench','mobile_bench','service_counter','sink_unit'],
        '', 150, 25),

      (c.id, 'BENCH_BASE_SHELF_REMOVABLE',
        'Removable base shelf (sat in frame, full length)',
        array['wall_bench','work_bench','mobile_bench','service_counter','sink_unit'],
        '', 150, 15),

      (c.id, 'BENCH_MID_SHELF_FIXED',
        'Fixed mid shelf (welded)',
        array['wall_bench','work_bench','mobile_bench','service_counter','sink_unit'],
        '', 150, 25),

      (c.id, 'BENCH_MID_SHELF_ADJ',
        'Adjustable mid shelf (on ladder racking)',
        array['wall_bench','work_bench','mobile_bench','service_counter','sink_unit'],
        '', 200, 30),

      (c.id, 'BENCH_TOP_SHELF',
        'Top shelf / over-shelf (fixed)',
        array['wall_bench','work_bench','service_counter','sink_unit'],
        '', 180, 30)
    on conflict (company_id, code) do nothing;

  end loop;
end $$;
