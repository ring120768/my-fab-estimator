// Pricing engine v2 — multi-product, multi-line quotes.
//
// The v1 (single-table) types live in ../types.ts and continue to work.
// The v2 types support the full CCE product taxonomy. They share `LabourRate`,
// `MaterialRate`, `ProcessRate`, `CostingRules`, `CompanyCostingData` and the
// formatting helpers from v1, so we don't re-define them here.

import type {
  CompanyCostingData,
  CostLine,
  Finish,
} from "../types";

export type { CompanyCostingData, CostLine, Finish };

// ---------- Product type identifiers (mirror DB product_types.code) ----------

export type ProductType =
  | "worktop"
  | "splashback"
  | "wall_bench"
  | "work_bench"
  | "mobile_bench"
  | "service_counter"
  | "sink_unit"
  | "dishwash_table"
  | "hot_cupboard"
  | "wall_cupboard"
  | "storage_cupboard"
  | "wall_shelf"
  | "over_shelf"
  | "pot_shelf"
  | "basket_shelf"
  | "drip_tray"
  | "island_counter"
  | "rack"
  | "custom"
  | "free_text"
  | "bought_in"
  | "delivery";

// "Under to be..." structural pattern for benches, counters, sink units.
export type UnderStructure =
  | "open_no_panels"
  | "open_with_base_shelf"
  | "open_with_void"
  | "open_with_mid_shelf"
  | "cupboard_hinged"
  | "cupboard_sliding"
  | "drawer_bank"
  | "mixed"
  | "lined_lockable";

// Stainless steel grade/thickness/finish.
export interface MaterialSpec {
  grade: "304" | "316" | "430";
  swg: 18 | 16 | 14 | 10;   // 1.2 / 1.5 / 2.0 / 3.0 mm
  finish: Finish;            // brushed | burnished | mirror
}

// ---------- Per-product spec types ----------

interface BaseSpec {
  length_mm: number;
  depth_mm: number;
  height_mm?: number;
  material: MaterialSpec;
}

export interface WorktopSpec extends BaseSpec {
  product_type: "worktop";
  downturn_all_sides: boolean;
  upstand_size_mm: 0 | 50 | 100 | 150 | 300 | 400 | number;
  upstand_position?: "rear" | "rear_and_ends";
}

export interface SplashbackSpec extends BaseSpec {
  product_type: "splashback";
  wall_height_mm: number;        // visible wall height covered
  joining_edge_left?: boolean;
  joining_edge_right?: boolean;
}

export interface BenchSpec extends BaseSpec {
  product_type: "wall_bench" | "work_bench" | "mobile_bench" | "service_counter" | "sink_unit" | "dishwash_table";
  height_mm: number;                  // benches always have a height
  upstand_size_mm: 0 | 50 | 100 | 150 | 300 | 400 | number;
  upstand_position?: "rear" | "rear_and_ends" | "rear_and_both_ends";
  under_structure: UnderStructure;
  number_of_legs: number;
  leg_section_mm: 25 | 30 | 40;     // box section size
}

export interface ShelfSpec extends BaseSpec {
  product_type: "wall_shelf" | "over_shelf" | "pot_shelf" | "basket_shelf";
  tiers: 1 | 2 | 3;
  rodded?: boolean;                  // pot shelf: rod construction
  angled?: boolean;                  // basket shelf: angled
  wall_brackets?: boolean;           // true = wall mount (default)
}

export interface CupboardSpec extends BaseSpec {
  product_type: "wall_cupboard" | "hot_cupboard" | "storage_cupboard";
  height_mm: number;
  doors: "none" | "hinged" | "sliding" | "passthrough";
  number_of_doors: number;
  internal_shelves: number;
  adjustable_shelves: boolean;
  lockable: boolean;
}

export interface DripTraySpec extends BaseSpec {
  product_type: "drip_tray";
  perforated_inserts: boolean;
  fixing_brackets: number;
}

export interface CustomSpec {
  product_type: "custom";
  description: string;               // estimator-typed
  manual_price_ex_vat: number;       // skip engine, take this as the price
}

export interface FreeTextSpec {
  product_type: "free_text";
  description: string;
  manual_price_ex_vat?: number;      // null => display only (£0)
}

export interface BoughtInSpec {
  product_type: "bought_in";
  description: string;
  manufacturer?: string;
  model?: string;
  supplier_list_price: number;
  supplier_discount_pct: number;     // 0-100
  markup_pct: number;                // 0-100
}

export interface DeliverySpec {
  product_type: "delivery";
  description: string;               // default text fillable
  manual_price_ex_vat: number;
  delivery_type: "kerbside" | "tail_lift" | "white_glove" | "install";
}

export type AnyProductSpec =
  | WorktopSpec
  | SplashbackSpec
  | BenchSpec
  | ShelfSpec
  | CupboardSpec
  | DripTraySpec
  | CustomSpec
  | FreeTextSpec
  | BoughtInSpec
  | DeliverySpec;

// ---------- Feature & sub-component selections ----------

/** A feature attached to a line item: the catalogue code + a quantity (default 1). */
export interface FeatureChoice {
  code: string;          // e.g. "SB500X400X300"
  quantity: number;      // default 1
  override_price?: number;
  override_label?: string;
}

/** A sub-component attached to a line item: the catalogue code + a quantity. */
export interface SubcomponentChoice {
  code: string;          // e.g. "DRAWER_RECESSED"
  quantity: number;
  size_label?: string;   // override the catalogue default (e.g. "1500")
  override_price?: number;
}

// ---------- Library types — read from the database ----------

export interface FeatureLibraryEntry {
  code: string;
  name: string;
  applies_to: ProductType[];
  material_cost: number;
  labour_minutes: number;
  labour_rate_type: "fabrication" | "welding" | "polishing" | "cad" | "installation";
  default_price?: number;
  unit_basis: "per_item" | "per_metre" | "per_m2";
}

export interface SubcomponentLibraryEntry {
  code: string;
  name: string;
  applies_to: ProductType[];
  size_label?: string;
  material_cost: number;
  labour_minutes: number;
  labour_rate_type: "fabrication" | "welding" | "polishing" | "cad" | "installation";
  default_price?: number;
}

export interface QuoteEngineLibrary {
  features: FeatureLibraryEntry[];
  subcomponents: SubcomponentLibraryEntry[];
}

// ---------- Line item input/output ----------

export interface LineItemInput {
  spec: AnyProductSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  // Optional estimator overrides
  labour_hours_override?: number;        // forces total labour hours (replaces engine default)
  unit_price_override?: number;          // forces sell price (bypasses calc, still records breakdown)
  description_override?: string;         // forces customer-facing description
}

export interface LineItemBreakdown {
  // Cost lines per line item
  material_lines: CostLine[];
  labour_lines: CostLine[];

  // Per-unit subtotals
  material_cost_per_unit: number;
  labour_cost_per_unit: number;
  consumables_cost_per_unit: number;
  build_cost_per_unit: number;
  overhead_cost_per_unit: number;
  total_cost_per_unit: number;

  // Margin/markup → unit selling price
  pricing_method: "margin" | "markup";
  margin_or_markup_percentage: number;
  unit_price_ex_vat: number;
  line_total_ex_vat: number;             // unit_price_ex_vat × quantity
}

export interface LineItemResult {
  ok: boolean;
  product_type: ProductType;
  description: string;                   // customer-facing
  breakdown: LineItemBreakdown | null;   // null if ok=false
  assumptions: string[];
  missing_information: string[];
  validation_errors: string[];
}

// ---------- Quote-level types ----------

export interface QuoteRollup {
  subtotal_ex_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_inc_vat: number;
  line_results: LineItemResult[];
}
