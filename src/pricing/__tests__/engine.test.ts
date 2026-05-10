import { describe, it, expect } from "vitest";
import { calculateTableEstimate, ENGINE_VERSION } from "../engine";
import { SAMPLE_COMPANY, SAMPLE_TABLE } from "./fixtures";

describe("calculateTableEstimate — happy path", () => {
  it("computes a deterministic breakdown for the sample table", () => {
    const r = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY);

    expect(r.ok).toBe(true);
    expect(r.validation_errors).toEqual([]);
    expect(r.breakdown).not.toBeNull();
    expect(r.snapshot).not.toBeNull();

    const b = r.breakdown!;

    // Sheet area: 1.8 × 0.7 = 1.26 m² top, + 1.26 m² undershelf = 2.52 m²
    // × 1.10 waste = 2.772 m². × £80 = £221.76
    const sheet = b.material_lines.find((l) => l.label.startsWith("Stainless sheet"));
    expect(sheet?.amount).toBeCloseTo(221.76, 2);

    // Legs: 4 × 0.9m = 3.6 m × £12 = £43.20
    const legs = b.material_lines.find((l) => l.label.includes("legs"));
    expect(legs?.amount).toBeCloseTo(43.2, 2);

    // Feet: 4 × £5 = £20
    const feet = b.material_lines.find((l) => l.label.includes("feet"));
    expect(feet?.amount).toBeCloseTo(20, 2);

    expect(b.material_cost_per_unit).toBeCloseTo(284.96, 2);

    // Quantity = 1 → totals match per-unit
    expect(b.total_cost_before_margin).toBeCloseTo(b.total_cost_per_unit, 2);

    // Sell price under 30% margin: sell = cost / 0.7
    const expectedSell = b.total_cost_before_margin / 0.7;
    expect(b.sell_price_ex_vat).toBeCloseTo(expectedSell, 2);

    // VAT 20%
    expect(b.vat_amount).toBeCloseTo(b.sell_price_ex_vat * 0.2, 2);
    expect(b.total_inc_vat).toBeCloseTo(b.sell_price_ex_vat + b.vat_amount, 2);
  });

  it("is deterministic — same input produces identical numbers", () => {
    const a = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    const b = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    expect(a.sell_price_ex_vat).toEqual(b.sell_price_ex_vat);
    expect(a.material_cost_per_unit).toEqual(b.material_cost_per_unit);
    expect(a.labour_cost_per_unit).toEqual(b.labour_cost_per_unit);
  });

  it("scales totals with quantity", () => {
    const single = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    const tripled = calculateTableEstimate({ ...SAMPLE_TABLE, quantity: 3 }, SAMPLE_COMPANY).breakdown!;
    expect(tripled.total_cost_before_margin).toBeCloseTo(single.total_cost_per_unit * 3, 2);
  });

  it("captures a costing snapshot with engine version", () => {
    const r = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY);
    expect(r.snapshot?.engine_version).toBe(ENGINE_VERSION);
    expect(r.snapshot?.material_rates_used.length).toBeGreaterThanOrEqual(2);
    expect(typeof r.snapshot?.taken_at).toBe("string");
  });
});

describe("missing rates surface as errors — never invent costs", () => {
  it("errors when sheet rate is missing for the requested grade/thickness", () => {
    const r = calculateTableEstimate(
      { ...SAMPLE_TABLE, sheet_thickness_mm: 2.0 }, // no 2.0mm row
      SAMPLE_COMPANY
    );
    expect(r.ok).toBe(false);
    expect(r.breakdown).toBeNull();
    expect(r.validation_errors.some((e) => e.includes("sheet rate"))).toBe(true);
    expect(r.missing_information.length).toBeGreaterThan(0);
  });

  it("errors when leg material is missing", () => {
    const company = {
      ...SAMPLE_COMPANY,
      material_rates: SAMPLE_COMPANY.material_rates.filter(
        (m) => m.category !== "box_section"
      ),
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company);
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.includes("box_section"))).toBe(true);
  });

  it("errors when adjustable feet are required but no feet rate exists", () => {
    const company = {
      ...SAMPLE_COMPANY,
      material_rates: SAMPLE_COMPANY.material_rates.filter((m) => m.category !== "feet"),
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company);
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.includes("feet"))).toBe(true);
  });

  it("does NOT require feet rate when adjustable_feet=false", () => {
    const company = {
      ...SAMPLE_COMPANY,
      material_rates: SAMPLE_COMPANY.material_rates.filter((m) => m.category !== "feet"),
    };
    const r = calculateTableEstimate(
      { ...SAMPLE_TABLE, adjustable_feet: false },
      company
    );
    expect(r.ok).toBe(true);
  });

  it("errors when a labour rate referenced by a process is missing", () => {
    const company = {
      ...SAMPLE_COMPANY,
      labour_rates: SAMPLE_COMPANY.labour_rates.filter((l) => l.rate_type !== "welding"),
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company);
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.toLowerCase().includes("welding"))).toBe(true);
  });
});

describe("input validation", () => {
  it("rejects zero or negative dimensions", () => {
    const r = calculateTableEstimate({ ...SAMPLE_TABLE, length_mm: 0 }, SAMPLE_COMPANY);
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.includes("Length"))).toBe(true);
  });

  it("rejects quantity < 1", () => {
    const r = calculateTableEstimate({ ...SAMPLE_TABLE, quantity: 0 }, SAMPLE_COMPANY);
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.includes("Quantity"))).toBe(true);
  });

  it("rejects rear_upstand=true with zero upstand height", () => {
    const r = calculateTableEstimate(
      { ...SAMPLE_TABLE, rear_upstand: true, upstand_height_mm: 0 },
      SAMPLE_COMPANY
    );
    expect(r.ok).toBe(false);
    expect(r.validation_errors.some((e) => e.includes("Upstand"))).toBe(true);
  });
});

describe("pricing method — margin vs markup", () => {
  it("margin method: sell = cost / (1 - margin)", () => {
    const r = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    expect(r.sell_price_ex_vat).toBeCloseTo(r.total_cost_before_margin / 0.7, 2);
  });

  it("markup method: sell = cost × (1 + markup)", () => {
    const company = {
      ...SAMPLE_COMPANY,
      costing_rules: { ...SAMPLE_COMPANY.costing_rules, pricing_method: "markup" as const },
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company).breakdown!;
    expect(r.sell_price_ex_vat).toBeCloseTo(r.total_cost_before_margin * 1.3, 2);
    // Sanity: markup at the same % yields a LOWER sell price than margin.
    const margin = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    expect(r.sell_price_ex_vat).toBeLessThan(margin.sell_price_ex_vat);
  });
});

describe("VAT", () => {
  it("applies VAT when company is VAT-registered", () => {
    const r = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    expect(r.vat_rate).toBe(20);
    expect(r.vat_amount).toBeGreaterThan(0);
    expect(r.total_inc_vat).toBeCloseTo(r.sell_price_ex_vat + r.vat_amount, 2);
  });

  it("zeros VAT when company is not VAT-registered", () => {
    const company = {
      ...SAMPLE_COMPANY,
      costing_rules: { ...SAMPLE_COMPANY.costing_rules, vat_registered: false },
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company).breakdown!;
    expect(r.vat_rate).toBe(0);
    expect(r.vat_amount).toBe(0);
    expect(r.total_inc_vat).toEqual(r.sell_price_ex_vat);
  });
});

describe("rounding and minimum order value", () => {
  it("rounds sell price to nearest unit when rounding enabled", () => {
    const company = {
      ...SAMPLE_COMPANY,
      costing_rules: {
        ...SAMPLE_COMPANY.costing_rules,
        rounding_enabled: true,
        rounding_unit: 10,
      },
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company).breakdown!;
    expect(r.sell_price_ex_vat % 10).toBe(0);
  });

  it("raises sell price to minimum order value when below it", () => {
    const company = {
      ...SAMPLE_COMPANY,
      costing_rules: { ...SAMPLE_COMPANY.costing_rules, minimum_order_value: 5000 },
    };
    const r = calculateTableEstimate(SAMPLE_TABLE, company);
    expect(r.breakdown!.sell_price_ex_vat).toBeGreaterThanOrEqual(5000);
    expect(r.assumptions.some((a) => a.includes("minimum order value"))).toBe(true);
  });
});

describe("undershelf and upstand affect sheet area", () => {
  it("removing undershelf reduces material cost", () => {
    const withShelf = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    const noShelf = calculateTableEstimate(
      { ...SAMPLE_TABLE, undershelf: false },
      SAMPLE_COMPANY
    ).breakdown!;
    expect(noShelf.material_cost_per_unit).toBeLessThan(withShelf.material_cost_per_unit);
  });

  it("adding rear upstand increases material AND polishing cost", () => {
    const flat = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY).breakdown!;
    const upstand = calculateTableEstimate(
      { ...SAMPLE_TABLE, rear_upstand: true, upstand_height_mm: 100 },
      SAMPLE_COMPANY
    ).breakdown!;
    expect(upstand.material_cost_per_unit).toBeGreaterThan(flat.material_cost_per_unit);
    expect(upstand.labour_cost_per_unit).toBeGreaterThan(flat.labour_cost_per_unit);
  });
});
