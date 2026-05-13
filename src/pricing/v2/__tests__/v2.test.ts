import { describe, it, expect } from "vitest";
import { calculateBench } from "../products/bench";
import { calculateWorktop } from "../products/worktop";
import { calculateLineItem, rollUpQuote, ENGINE_VERSION_V2 } from "../quote";
import { SAMPLE_COMPANY, SAMPLE_LIBRARY } from "./fixtures";
import type {
  BenchSpec, WorktopSpec, BoughtInSpec,
} from "../types";

const BASE_BENCH: BenchSpec = {
  product_type: "wall_bench",
  length_mm: 2000,
  depth_mm: 700,
  height_mm: 900,
  material: { grade: "304", swg: 16, finish: "brushed" },
  upstand_size_mm: 50,
  upstand_position: "rear",
  under_structure: "open_with_base_shelf",
  number_of_legs: 4,
  leg_section_mm: 30,
};

describe("calculateBench — wall_bench", () => {
  it("produces a sensible price and description for a stock wall bench", () => {
    const r = calculateBench({
      spec: BASE_BENCH,
      features: [],
      subcomponents: [],
      quantity: 1,
      library: SAMPLE_LIBRARY,
      company: SAMPLE_COMPANY,
    });
    expect(r.ok).toBe(true);
    expect(r.product_type).toBe("wall_bench");
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.breakdown!.material_lines.length).toBeGreaterThan(0);
    expect(r.breakdown!.labour_lines.length).toBeGreaterThan(0);
    expect(r.description.toLowerCase()).toContain("wall bench");
    expect(r.description).toContain("2000mm × 700mm × 900mm");
    expect(r.description.toLowerCase()).toContain("upstand");
  });

  it("is deterministic — same input produces same output", () => {
    const r1 = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    const r2 = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r1.breakdown!.unit_price_ex_vat).toEqual(r2.breakdown!.unit_price_ex_vat);
  });

  it("a wall bench with a sink bowl costs more than one without (post-margin add-on)", () => {
    const noBowl = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const withBowl = calculateBench({
      spec: BASE_BENCH,
      features: [{ code: "SB500X400X300", quantity: 1 }],
      subcomponents: [],
      quantity: 1,
      library: SAMPLE_LIBRARY,
      company: SAMPLE_COMPANY,
    }).breakdown!;
    // Catalogue items add to post_margin_cost — exact pass-through, no margin re-applied
    expect(withBowl.post_margin_cost_per_unit - noBowl.post_margin_cost_per_unit).toBeCloseTo(434, 0);
    expect(withBowl.unit_price_ex_vat - noBowl.unit_price_ex_vat).toBeCloseTo(434, 0);
    expect(withBowl.material_cost_per_unit).toEqual(noBowl.material_cost_per_unit);
  });

  it("a mirror finish costs more than brushed (2× polishing labour)", () => {
    const brushed = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const mirror = calculateBench({
      spec: { ...BASE_BENCH, material: { ...BASE_BENCH.material, finish: "mirror" } },
      features: [], subcomponents: [], quantity: 1,
      library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY,
    }).breakdown!;
    expect(mirror.labour_cost_per_unit).toBeGreaterThan(brushed.labour_cost_per_unit);
  });

  it("missing sheet rate surfaces as a validation error", () => {
    const r = calculateBench({
      spec: { ...BASE_BENCH, material: { ...BASE_BENCH.material, swg: 14 as const } },
      features: [], subcomponents: [], quantity: 1,
      library: SAMPLE_LIBRARY,
      // SAMPLE_COMPANY only has 1.2/1.5/2.0 grade 304 — 14swg is 2.0 which exists
      company: { ...SAMPLE_COMPANY, material_rates: SAMPLE_COMPANY.material_rates.filter(m => !(m.category === "sheet" && m.thickness_mm === 2.0)) },
    });
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.toLowerCase().includes("sheet"))).toBe(true);
  });

  it("estimator can override labour hours", () => {
    const r1 = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    const r2 = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY, labour_hours_override: 8 });
    expect(r2.breakdown!.labour_cost_per_unit).toBeGreaterThan(r1.breakdown!.labour_cost_per_unit);
  });

  it("structure type changes labour hours", () => {
    const open = calculateBench({ spec: { ...BASE_BENCH, under_structure: "open_no_panels" }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const drawerBank = calculateBench({ spec: { ...BASE_BENCH, under_structure: "drawer_bank" }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(drawerBank.labour_cost_per_unit).toBeGreaterThan(open.labour_cost_per_unit);
  });

  it("scales line total with quantity", () => {
    const single = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const three = calculateBench({ spec: BASE_BENCH, features: [], subcomponents: [], quantity: 3, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(three.line_total_ex_vat).toBeCloseTo(single.unit_price_ex_vat * 3, 1);
  });
});

describe("calculateWorktop", () => {
  const BASE: WorktopSpec = {
    product_type: "worktop",
    length_mm: 1800,
    depth_mm: 700,
    material: { grade: "304", swg: 16, finish: "brushed" },
    downturn_all_sides: true,
    upstand_size_mm: 50,
    upstand_position: "rear",
  };

  it("computes a worktop price", () => {
    const r = calculateWorktop({ spec: BASE, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description).toContain("1800mm × 700mm");
    expect(r.description.toLowerCase()).toContain("work top");
  });

  it("a worktop with sink bowl + anti-drip edge costs more (post-margin pass-through)", () => {
    const plain = calculateWorktop({ spec: BASE, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const loaded = calculateWorktop({
      spec: BASE,
      features: [
        { code: "SB500X400X300", quantity: 1 },
        { code: "ADE_LOCAL", quantity: 1 },
      ],
      subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY,
    }).breakdown!;
    expect(loaded.unit_price_ex_vat).toBeGreaterThan(plain.unit_price_ex_vat);
    // Catalogue features pass through directly: £434 + £240 = £674 added
    expect(loaded.post_margin_cost_per_unit - plain.post_margin_cost_per_unit).toBeCloseTo(674, 0);
    expect(loaded.unit_price_ex_vat - plain.unit_price_ex_vat).toBeCloseTo(674, 0);
  });
});

describe("dispatcher + rollUpQuote", () => {
  it("dispatches a quote with mixed line items and totals correctly", () => {
    const results = [
      calculateLineItem(
        { spec: BASE_BENCH, features: [], subcomponents: [], quantity: 1 },
        SAMPLE_LIBRARY, SAMPLE_COMPANY
      ),
      calculateLineItem(
        {
          spec: {
            product_type: "bought_in",
            description: "Rational iCombi 10-1/1",
            manufacturer: "Rational",
            model: "iCombi Pro",
            supplier_list_price: 14005,
            supplier_discount_pct: 30,
            markup_pct: 15,
          },
          features: [], subcomponents: [], quantity: 1,
        },
        SAMPLE_LIBRARY, SAMPLE_COMPANY
      ),
      calculateLineItem(
        {
          spec: {
            product_type: "delivery",
            description: "Tail lift delivery, ground floor",
            manual_price_ex_vat: 350,
            delivery_type: "tail_lift",
          },
          features: [], subcomponents: [], quantity: 1,
        },
        SAMPLE_LIBRARY, SAMPLE_COMPANY
      ),
    ];

    expect(results.every(r => r.ok)).toBe(true);

    const q = rollUpQuote(results, SAMPLE_COMPANY);
    expect(q.subtotal_ex_vat).toBeGreaterThan(0);
    expect(q.vat_rate).toBe(20);
    expect(q.vat_amount).toBeCloseTo(q.subtotal_ex_vat * 0.2, 2);
    expect(q.total_inc_vat).toBeCloseTo(q.subtotal_ex_vat + q.vat_amount, 2);
  });

  it("bought_in honours supplier discount and markup", () => {
    const r = calculateLineItem(
      {
        spec: {
          product_type: "bought_in",
          description: "Test item",
          supplier_list_price: 1000,
          supplier_discount_pct: 30,  // → cost = 700
          markup_pct: 20,             // → sell = 840
        },
        features: [], subcomponents: [], quantity: 2,
      },
      SAMPLE_LIBRARY, SAMPLE_COMPANY
    );
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeCloseTo(840, 1);
    expect(r.breakdown!.line_total_ex_vat).toBeCloseTo(1680, 1);
  });
});

describe("engine versioning", () => {
  it("exposes a version string", () => {
    expect(ENGINE_VERSION_V2).toBeTruthy();
  });
});
