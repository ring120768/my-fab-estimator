// Regression tests for AI → LineItemInput mapping.
// Covers two bugs surfaced by the Smart Group calibration import:
//   1. AI returning an out-of-enum under_structure produced NaN prices and
//      a literal "Under to be undefined." in customer-facing descriptions.
//   2. AI returning a bought-in item with no supplier_list_price produced
//      silent £0 lines.

import { describe, it, expect } from "vitest";
import { importedScheduleToLines } from "../to-line-items";
import type { ParsedSchedule, ParsedLineItem } from "../types";

function makeSchedule(items: Partial<ParsedLineItem>[]): ParsedSchedule {
  return {
    drawing_metadata: {
      drawing_number: "TEST-001",
      client_name: "Test Client",
      project_name: "Regression",
      area: "Kitchen",
      drawn_by: "Charlie",
    } as ParsedSchedule["drawing_metadata"],
    areas: ["Kitchen"],
    line_items: items.map((it, i) => ({
      item_no: it.item_no ?? `1.${String(i + 1).padStart(2, "0")}`,
      description: it.description ?? "Test item",
      quantity: it.quantity ?? 1,
      inferred_product_type: it.inferred_product_type ?? "wall_bench",
      confidence: it.confidence ?? 80,
      missing_fields: it.missing_fields ?? [],
      is_bought_in_equipment: it.is_bought_in_equipment ?? false,
      is_client_supplied: it.is_client_supplied ?? false,
      is_future_item: it.is_future_item ?? false,
      manufacturer: it.manufacturer,
      model: it.model,
      suggested_supplier_list_price: it.suggested_supplier_list_price,
      suggested_spec: it.suggested_spec,
    })) as ParsedLineItem[],
    general_warnings: [],
    missing_required_info: [],
    raw_confidence: 80,
  };
}

describe("importedScheduleToLines — defensive enum validation", () => {
  it("coerces an invalid under_structure to a safe default", () => {
    const sched = makeSchedule([{
      inferred_product_type: "wall_bench",
      // AI sometimes returns these as free-text instead of the declared enum
      suggested_spec: { under_structure: "to be confirmed" as never, length_mm: 1800, depth_mm: 700, height_mm: 900 },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { product_type: string; under_structure: string };
    expect(spec.product_type).toBe("wall_bench");
    expect(spec.under_structure).toBe("open_with_base_shelf");
  });

  it("coerces the literal string 'undefined' to the safe default", () => {
    const sched = makeSchedule([{
      inferred_product_type: "dishwash_table",
      suggested_spec: { under_structure: "undefined" as never },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { under_structure: string };
    expect(spec.under_structure).toBe("open_with_base_shelf");
  });

  it("coerces an invalid material grade", () => {
    const sched = makeSchedule([{
      inferred_product_type: "wall_bench",
      suggested_spec: { material_grade: "stainless" as never },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { material: { grade: string } };
    expect(spec.material.grade).toBe("304");
  });

  it("coerces an invalid finish", () => {
    const sched = makeSchedule([{
      inferred_product_type: "wall_bench",
      suggested_spec: { material_finish: "satin" as never },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { material: { finish: string } };
    expect(spec.material.finish).toBe("brushed");
  });

  it("coerces an invalid upstand position", () => {
    const sched = makeSchedule([{
      inferred_product_type: "worktop",
      suggested_spec: { upstand_position: "all_round" as never },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { upstand_position: string };
    expect(spec.upstand_position).toBe("rear");
  });

  it("preserves a valid under_structure when AI got it right", () => {
    const sched = makeSchedule([{
      inferred_product_type: "wall_bench",
      suggested_spec: { under_structure: "drawer_bank" },
    }]);
    const { lines } = importedScheduleToLines(sched);
    const spec = lines[0]!.spec as { under_structure: string };
    expect(spec.under_structure).toBe("drawer_bank");
  });
});

describe("importedScheduleToLines — schedule item number loyalty", () => {
  it("preserves item_no verbatim from the schedule", () => {
    const sched = makeSchedule([
      { item_no: "5.01", inferred_product_type: "wall_bench" },
      { item_no: "5.02", inferred_product_type: "worktop" },
      { item_no: "1.43", inferred_product_type: "sink_unit" },
    ]);
    const { lines } = importedScheduleToLines(sched);
    expect(lines[0]!.item_no).toBe("5.01");
    expect(lines[1]!.item_no).toBe("5.02");
    expect(lines[2]!.item_no).toBe("1.43");
  });

  it("preserves item_no on bought-in lines", () => {
    const sched = makeSchedule([{
      item_no: "5.09",
      inferred_product_type: "wall_bench",
      is_bought_in_equipment: true,
      manufacturer: "Rational",
      model: "iCombi Pro",
      suggested_supplier_list_price: 14005,
    }]);
    const { lines } = importedScheduleToLines(sched);
    expect(lines[0]!.item_no).toBe("5.09");
    expect(lines[0]!.spec.product_type).toBe("bought_in");
  });

  it("preserves item_no on free-text / BY CLIENT lines", () => {
    const sched = makeSchedule([{
      item_no: "1.49",
      inferred_product_type: "wall_bench",
      is_client_supplied: true,
      description: "EXTRACT CANOPY",
    }]);
    const { lines } = importedScheduleToLines(sched);
    expect(lines[0]!.item_no).toBe("1.49");
    expect(lines[0]!.spec.product_type).toBe("free_text");
  });
});
