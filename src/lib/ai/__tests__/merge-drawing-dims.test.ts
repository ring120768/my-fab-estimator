// Tests for the drawing-into-schedule dimension merger.
// Confirms:
//   - dims from drawing populate suggested_spec when schedule had none
//   - dims from schedule are preserved when both are present
//   - matching by item_no is the canonical path
//   - label fallback works when item_no isn't set
//   - non-bespoke items (bought-in / BY CLIENT) are never touched
//   - provenance tag is added to missing_fields

import { describe, it, expect } from "vitest";
import { mergeDrawingDimensions } from "../merge-drawing-dims";
import type { ParsedSchedule, ParsedLineItem } from "../types";
import type { ParsedDrawing, DimensionedItem } from "@/lib/drawing/types";

function schedItem(overrides: Partial<ParsedLineItem>): ParsedLineItem {
  return {
    item_no: "1.01",
    quantity: 1,
    manufacturer: "CCE BESPOKE",
    description: "wall bench",
    inferred_product_type: "wall_bench",
    is_bespoke_fabrication: true,
    is_bought_in_equipment: false,
    is_client_supplied: false,
    is_future_item: false,
    confidence: 80,
    missing_fields: [],
    ...overrides,
  };
}

function drawItem(overrides: Partial<DimensionedItem>): DimensionedItem {
  return {
    label: "wall bench",
    quantity: 1,
    dimension_sources: {},
    confidence: 90,
    missing_fields: [],
    ...overrides,
  };
}

function schedule(items: ParsedLineItem[]): ParsedSchedule {
  return {
    drawing_metadata: {} as ParsedSchedule["drawing_metadata"],
    areas: [],
    line_items: items,
    general_warnings: [],
    missing_required_info: [],
    raw_confidence: 80,
  };
}

function drawing(items: DimensionedItem[]): ParsedDrawing {
  return {
    drawing_metadata: { units: "mm" },
    primary_method: "annotations",
    items,
    general_warnings: [],
    missing_required_info: [],
    raw_confidence: 85,
  };
}

describe("mergeDrawingDimensions", () => {
  it("copies drawing dims into a bespoke line that had none from the schedule", () => {
    const sched = schedule([schedItem({ item_no: "5.01" })]);
    const drw = drawing([drawItem({ item_no: "5.01", length_mm: 2000, depth_mm: 700, height_mm: 900 })]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec?.length_mm).toBe(2000);
    expect(out.line_items[0]!.suggested_spec?.depth_mm).toBe(700);
    expect(out.line_items[0]!.suggested_spec?.height_mm).toBe(900);
  });

  it("prefers schedule dims when both parsers produced them", () => {
    const sched = schedule([schedItem({
      item_no: "5.01",
      suggested_spec: { length_mm: 1800, depth_mm: 700 }
    })]);
    const drw = drawing([drawItem({ item_no: "5.01", length_mm: 2000, depth_mm: 700, height_mm: 900 })]);
    const out = mergeDrawingDimensions(sched, drw);
    // Schedule's 1800 wins over drawing's 2000
    expect(out.line_items[0]!.suggested_spec?.length_mm).toBe(1800);
    // Height was missing in schedule → drawing fills it
    expect(out.line_items[0]!.suggested_spec?.height_mm).toBe(900);
  });

  it("falls back to label match when item_no is missing", () => {
    const sched = schedule([schedItem({ item_no: "", description: "SINK UNIT" })]);
    const drw = drawing([drawItem({ label: "SINK UNIT", length_mm: 1800, depth_mm: 700, height_mm: 900 })]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec?.length_mm).toBe(1800);
  });

  it("never enriches bought-in equipment", () => {
    const sched = schedule([schedItem({
      item_no: "5.05",
      description: "Rational iCombi Pro",
      is_bespoke_fabrication: false,
      is_bought_in_equipment: true,
    })]);
    const drw = drawing([drawItem({ item_no: "5.05", length_mm: 900, depth_mm: 800, height_mm: 950 })]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec).toBeUndefined();
  });

  it("never enriches BY CLIENT lines", () => {
    const sched = schedule([schedItem({
      item_no: "5.09",
      is_bespoke_fabrication: false,
      is_client_supplied: true,
    })]);
    const drw = drawing([drawItem({ item_no: "5.09", length_mm: 1000 })]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec).toBeUndefined();
  });

  it("leaves items untouched when no drawing match is found", () => {
    const sched = schedule([schedItem({ item_no: "5.01" })]);
    const drw = drawing([drawItem({ item_no: "5.99", length_mm: 2000 })]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec).toBeUndefined();
  });

  it("adds a provenance tag to missing_fields", () => {
    const sched = schedule([schedItem({ item_no: "5.01" })]);
    const drw = drawing([drawItem({ item_no: "5.01", length_mm: 2000, depth_mm: 700, height_mm: 900 })]);
    const out = mergeDrawingDimensions(sched, drw);
    const tag = out.line_items[0]!.missing_fields.find((m) => m.startsWith("dimension_source:"));
    expect(tag).toBe("dimension_source: drawing (annotations)");
  });

  it("processes a mixed schedule — only bespoke items merge, others pass through", () => {
    const sched = schedule([
      schedItem({ item_no: "5.01" }),
      schedItem({ item_no: "5.02", is_bespoke_fabrication: false, is_bought_in_equipment: true }),
      schedItem({ item_no: "5.03" }),
    ]);
    const drw = drawing([
      drawItem({ item_no: "5.01", length_mm: 2000, depth_mm: 700, height_mm: 900 }),
      drawItem({ item_no: "5.02", length_mm: 900, depth_mm: 800 }),
      drawItem({ item_no: "5.03", length_mm: 1500, depth_mm: 600, height_mm: 900 }),
    ]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out.line_items[0]!.suggested_spec?.length_mm).toBe(2000);
    expect(out.line_items[1]!.suggested_spec).toBeUndefined();       // bought-in untouched
    expect(out.line_items[2]!.suggested_spec?.length_mm).toBe(1500);
  });

  it("returns the schedule unchanged when the drawing has no items", () => {
    const sched = schedule([schedItem({ item_no: "5.01" })]);
    const drw = drawing([]);
    const out = mergeDrawingDimensions(sched, drw);
    expect(out).toEqual(sched);
  });
});
