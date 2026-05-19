// Tests for the catalogue matcher — the second half of the bought-in fix.
// Verifies that:
//   - exact (case-insensitive) matches attach catalogue prices
//   - normalised matches catch AI vs catalogue spelling drift
//   - stock-code matches work when AI puts a code in the model field
//   - unmatched items pass through unchanged (estimator will fill in)
//   - bespoke / by-client / future items are never matched

import { describe, it, expect } from "vitest";
import { matchAgainstCatalogue } from "../catalogue-match";
import type { ParsedSchedule, ParsedLineItem } from "../types";

const CATALOGUE = [
  { id: "uuid-rational-icombi-10", stock_code: "RAT1-E00100", manufacturer: "Rational", model: "iCombi Pro 10-1/1", list_price: 14005, default_supplier_discount_pct: 30 },
  { id: "uuid-rational-stand",     stock_code: "RAT1-E00200", manufacturer: "Rational", model: "60.31.319",        list_price: 1291.8, default_supplier_discount_pct: 38 },
  { id: "uuid-blue-seal-gt60",     stock_code: "BLU1-E00045", manufacturer: "Blue Seal", model: "GT60",             list_price: 3200, default_supplier_discount_pct: 25 },
  { id: "uuid-precision-mcu211",   stock_code: "PRE1-E00071", manufacturer: "Precision", model: "MCU 211",          list_price: 4210, default_supplier_discount_pct: 48 },
];

function makeSched(items: Partial<ParsedLineItem>[]): ParsedSchedule {
  return {
    drawing_metadata: {} as ParsedSchedule["drawing_metadata"],
    areas: [],
    line_items: items.map((it, i) => ({
      item_no: it.item_no ?? `1.${String(i + 1).padStart(2, "0")}`,
      quantity: it.quantity ?? 1,
      manufacturer: it.manufacturer ?? "",
      model: it.model,
      description: it.description ?? "",
      inferred_product_type: it.inferred_product_type ?? "wall_bench",
      is_bespoke_fabrication: it.is_bespoke_fabrication ?? false,
      is_bought_in_equipment: it.is_bought_in_equipment ?? false,
      is_client_supplied: it.is_client_supplied ?? false,
      is_future_item: it.is_future_item ?? false,
      confidence: it.confidence ?? 80,
      missing_fields: it.missing_fields ?? [],
      suggested_supplier_list_price: it.suggested_supplier_list_price,
    })) as ParsedLineItem[],
    general_warnings: [],
    missing_required_info: [],
    raw_confidence: 80,
  };
}

describe("matchAgainstCatalogue", () => {
  it("attaches a catalogue match on exact (case-insensitive) manufacturer+model", () => {
    const sched = makeSched([
      { is_bought_in_equipment: true, manufacturer: "Rational", model: "iCombi Pro 10-1/1" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    const cm = out.line_items[0]!.catalogue_match;
    expect(cm).toBeDefined();
    expect(cm!.match_method).toBe("exact");
    expect(cm!.list_price).toBe(14005);
    expect(cm!.supplier_discount_pct).toBe(30);
    expect(cm!.stock_code).toBe("RAT1-E00100");
  });

  it("matches case-insensitively (RATIONAL vs Rational)", () => {
    const sched = makeSched([
      { is_bought_in_equipment: true, manufacturer: "RATIONAL", model: "icombi pro 10-1/1" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match?.match_method).toBe("exact");
  });

  it("falls back to normalised match when whitespace/punctuation differs", () => {
    const sched = makeSched([
      // AI returns "MCU211" (no space) — catalogue has "MCU 211".
      // Same model number, just whitespace drift. Normalisation should catch it.
      { is_bought_in_equipment: true, manufacturer: "Precision", model: "MCU211" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match?.match_method).toBe("normalized");
    expect(out.line_items[0]!.catalogue_match?.list_price).toBe(4210);
  });

  it("matches on stock_code when AI puts one in the model field", () => {
    const sched = makeSched([
      { is_bought_in_equipment: true, manufacturer: "Rational", model: "RAT1-E00200" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match?.match_method).toBe("stock_code");
    expect(out.line_items[0]!.catalogue_match?.list_price).toBe(1291.8);
  });

  it("leaves unmatched bought-in items without a catalogue_match", () => {
    const sched = makeSched([
      { is_bought_in_equipment: true, manufacturer: "Unknown", model: "XYZ-999" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match).toBeUndefined();
  });

  it("never attaches a catalogue_match to a bespoke line", () => {
    const sched = makeSched([
      { is_bespoke_fabrication: true, manufacturer: "Rational", model: "iCombi Pro 10-1/1" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match).toBeUndefined();
  });

  it("never attaches a catalogue_match to a BY CLIENT line", () => {
    const sched = makeSched([
      { is_client_supplied: true, manufacturer: "Rational", model: "iCombi Pro 10-1/1" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match).toBeUndefined();
  });

  it("processes a mixed schedule correctly — only bought-in items get enriched", () => {
    const sched = makeSched([
      { is_bespoke_fabrication: true, manufacturer: "CCE BESPOKE", model: "wall bench" },
      { is_bought_in_equipment: true, manufacturer: "Rational", model: "iCombi Pro 10-1/1" },
      { is_bought_in_equipment: true, manufacturer: "Blue Seal", model: "GT60" },
      { is_client_supplied: true, manufacturer: "Halton", model: "Canopy" },
      { is_bought_in_equipment: true, manufacturer: "MysteryBrand", model: "MB-100" },
    ]);
    const out = matchAgainstCatalogue(sched, CATALOGUE);
    expect(out.line_items[0]!.catalogue_match).toBeUndefined();        // bespoke
    expect(out.line_items[1]!.catalogue_match?.list_price).toBe(14005); // Rational
    expect(out.line_items[2]!.catalogue_match?.list_price).toBe(3200);  // Blue Seal
    expect(out.line_items[3]!.catalogue_match).toBeUndefined();        // by client
    expect(out.line_items[4]!.catalogue_match).toBeUndefined();        // unmatched
  });

  it("returns the schedule unchanged when catalogue is empty", () => {
    const sched = makeSched([
      { is_bought_in_equipment: true, manufacturer: "Rational", model: "iCombi Pro 10-1/1" },
    ]);
    const out = matchAgainstCatalogue(sched, []);
    expect(out.line_items[0]!.catalogue_match).toBeUndefined();
  });
});
