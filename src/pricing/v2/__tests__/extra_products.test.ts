import { describe, it, expect } from "vitest";
import { calculateSplashback } from "../products/splashback";
import { calculateShelf } from "../products/shelf";
import { calculateCupboard } from "../products/cupboard";
import { calculateDripTray } from "../products/drip_tray";
import { calculateBench } from "../products/bench";
import { calculateLineItem, rollUpQuote } from "../quote";
import { SAMPLE_COMPANY, SAMPLE_LIBRARY } from "./fixtures";
import type {
  CupboardSpec,
  DripTraySpec,
  ShelfSpec,
  SplashbackSpec,
  BenchSpec,
} from "../types";

describe("calculateSplashback", () => {
  const SPEC: SplashbackSpec = {
    product_type: "splashback",
    length_mm: 2000,
    depth_mm: 1,
    material: { grade: "304", swg: 18, finish: "brushed" },
    wall_height_mm: 600,
  };

  it("prices a 2m × 600mm splashback", () => {
    const r = calculateSplashback({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description).toContain("2000mm × 600mm");
  });

  it("a larger splashback costs more", () => {
    const small = calculateSplashback({ spec: { ...SPEC, length_mm: 1000 }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const big = calculateSplashback({ spec: { ...SPEC, length_mm: 3000 }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(big.unit_price_ex_vat).toBeGreaterThan(small.unit_price_ex_vat);
  });
});

describe("calculateShelf", () => {
  const SPEC: ShelfSpec = {
    product_type: "wall_shelf",
    length_mm: 1400,
    depth_mm: 300,
    material: { grade: "304", swg: 18, finish: "brushed" },
    tiers: 1,
    wall_brackets: true,
  };

  it("prices a standard wall shelf", () => {
    const r = calculateShelf({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description.toLowerCase()).toContain("wall shelf");
    expect(r.description).toContain("1400mm");
  });

  it("two-tier shelf costs more than single tier", () => {
    const one = calculateShelf({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const two = calculateShelf({ spec: { ...SPEC, tiers: 2 }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(two.unit_price_ex_vat).toBeGreaterThan(one.unit_price_ex_vat);
  });

  it("rodded pot shelf uses less sheet (cheaper material)", () => {
    const solid = calculateShelf({ spec: { ...SPEC, product_type: "wall_shelf" }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const rodded = calculateShelf({ spec: { ...SPEC, product_type: "pot_shelf", rodded: true }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(rodded.material_cost_per_unit).toBeLessThan(solid.material_cost_per_unit);
  });
});

describe("calculateCupboard", () => {
  const SPEC: CupboardSpec = {
    product_type: "wall_cupboard",
    length_mm: 1450,
    depth_mm: 300,
    height_mm: 600,
    material: { grade: "304", swg: 18, finish: "brushed" },
    doors: "hinged",
    number_of_doors: 2,
    internal_shelves: 1,
    adjustable_shelves: true,
    lockable: false,
  };

  it("prices a wall cupboard with hinged doors", () => {
    const r = calculateCupboard({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description.toLowerCase()).toContain("wall cupboard");
    expect(r.description.toLowerCase()).toContain("hinged");
  });

  it("hot cupboard with more doors costs more than wall cupboard", () => {
    const wallC = calculateCupboard({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const hotC = calculateCupboard({ spec: { ...SPEC, product_type: "hot_cupboard", height_mm: 900, doors: "sliding", number_of_doors: 4 }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(hotC.unit_price_ex_vat).toBeGreaterThan(wallC.unit_price_ex_vat);
  });

  it("adjustable shelves cost more than fixed", () => {
    const fixed = calculateCupboard({ spec: { ...SPEC, adjustable_shelves: false }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const adj = calculateCupboard({ spec: { ...SPEC, adjustable_shelves: true }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(adj.labour_cost_per_unit).toBeGreaterThan(fixed.labour_cost_per_unit);
  });
});

describe("calculateDripTray", () => {
  const SPEC: DripTraySpec = {
    product_type: "drip_tray",
    length_mm: 2900,
    depth_mm: 120,
    height_mm: 30,
    material: { grade: "304", swg: 16, finish: "brushed" },
    perforated_inserts: true,
    fixing_brackets: 4,
  };

  it("prices a long drip tray", () => {
    const r = calculateDripTray({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description).toContain("2900mm");
    expect(r.description.toLowerCase()).toContain("perforated inserts");
  });

  it("perforated inserts add cost vs plain base", () => {
    const plain = calculateDripTray({ spec: { ...SPEC, perforated_inserts: false }, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    const perf = calculateDripTray({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY }).breakdown!;
    expect(perf.unit_price_ex_vat).toBeGreaterThan(plain.unit_price_ex_vat);
  });
});

describe("calculateBench — dishwash_table", () => {
  const SPEC: BenchSpec = {
    product_type: "dishwash_table",
    length_mm: 2000,
    depth_mm: 800,
    height_mm: 850,
    material: { grade: "304", swg: 16, finish: "brushed" },
    upstand_size_mm: 300,
    upstand_position: "rear",
    under_structure: "open_with_base_shelf",
    number_of_legs: 4,
    leg_section_mm: 30,
  };

  it("prices a dishwash table with 300mm upstand", () => {
    const r = calculateBench({ spec: SPEC, features: [], subcomponents: [], quantity: 1, library: SAMPLE_LIBRARY, company: SAMPLE_COMPANY });
    expect(r.ok).toBe(true);
    expect(r.product_type).toBe("dishwash_table");
    expect(r.breakdown!.unit_price_ex_vat).toBeGreaterThan(0);
    expect(r.description.toLowerCase()).toContain("dishwash table");
    expect(r.description).toContain("300mm high upstand");
  });
});

describe("dispatcher — all new product types route correctly", () => {
  it("routes splashback, shelf, cupboard, drip_tray through calculateLineItem", () => {
    const splash = calculateLineItem(
      {
        spec: {
          product_type: "splashback",
          length_mm: 1800, depth_mm: 1,
          material: { grade: "304", swg: 18, finish: "brushed" },
          wall_height_mm: 500,
        },
        features: [], subcomponents: [], quantity: 1,
      },
      SAMPLE_LIBRARY, SAMPLE_COMPANY
    );
    expect(splash.ok).toBe(true);
    expect(splash.product_type).toBe("splashback");

    const shelf = calculateLineItem(
      {
        spec: {
          product_type: "wall_shelf",
          length_mm: 1400, depth_mm: 300,
          material: { grade: "304", swg: 18, finish: "brushed" },
          tiers: 1,
        },
        features: [], subcomponents: [], quantity: 1,
      },
      SAMPLE_LIBRARY, SAMPLE_COMPANY
    );
    expect(shelf.ok).toBe(true);
    expect(shelf.product_type).toBe("wall_shelf");

    const cup = calculateLineItem(
      {
        spec: {
          product_type: "wall_cupboard",
          length_mm: 1000, depth_mm: 300, height_mm: 600,
          material: { grade: "304", swg: 18, finish: "brushed" },
          doors: "hinged", number_of_doors: 2,
          internal_shelves: 1, adjustable_shelves: false, lockable: false,
        },
        features: [], subcomponents: [], quantity: 1,
      },
      SAMPLE_LIBRARY, SAMPLE_COMPANY
    );
    expect(cup.ok).toBe(true);

    const dt = calculateLineItem(
      {
        spec: {
          product_type: "drip_tray",
          length_mm: 1200, depth_mm: 120, height_mm: 30,
          material: { grade: "304", swg: 16, finish: "brushed" },
          perforated_inserts: true, fixing_brackets: 3,
        },
        features: [], subcomponents: [], quantity: 1,
      },
      SAMPLE_LIBRARY, SAMPLE_COMPANY
    );
    expect(dt.ok).toBe(true);

    const totals = rollUpQuote([splash, shelf, cup, dt], SAMPLE_COMPANY);
    expect(totals.subtotal_ex_vat).toBeGreaterThan(0);
    expect(totals.total_inc_vat).toBeGreaterThan(totals.subtotal_ex_vat);
  });
});
