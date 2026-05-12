// Types for the pricing engine.
// These mirror the PRD data model but are simplified for the MVP table estimator.
// Database row types will likely import / extend these later.

// ---------- Inputs ----------

export type ConstructionType = "welded" | "bolted";
export type LegType = "box_section" | "tube" | "angle";
/** The three finishes CCE actually sells. "Mirror" uses 2× labour rate. */
export type Finish = "brushed" | "burnished" | "mirror";

/** What the user enters in the estimate builder for one stainless steel table. */
export interface TableSpec {
  quantity: number;
  length_mm: number;
  depth_mm: number;
  height_mm: number;
  material_grade: string;        // e.g. "304", "316"
  sheet_thickness_mm: number;    // e.g. 1.2
  finish: Finish;
  undershelf: boolean;
  rear_upstand: boolean;
  upstand_height_mm: number;     // ignored if rear_upstand=false
  leg_type: LegType;
  number_of_legs: number;
  adjustable_feet: boolean;
  construction: ConstructionType;
}

// ---------- Company costing data ----------

/** Hourly labour rate for a category of work. */
export interface LabourRate {
  rate_type: "fabrication" | "welding" | "polishing" | "cad" | "installation";
  hourly_rate: number;           // currency per hour
}

/** Material rate. category + grade + thickness/size identifies a row. */
export interface MaterialRate {
  category: "sheet" | "box_section" | "tube" | "angle" | "feet";
  grade?: string;                // "304", "316", n/a for feet
  thickness_mm?: number;         // sheet only
  size_label?: string;           // "30x30mm" for box section
  unit: "m2" | "metre" | "each";
  unit_cost: number;
  last_updated_at?: string;
}

/** A workshop process — folding, welding etc. The engine reads time_minutes * labour rate. */
export interface ProcessRate {
  process_name: "cutting" | "folding" | "welding" | "polishing" | "assembly" | "packing";
  basis: "per_item" | "per_metre" | "per_fold" | "per_m2";
  time_minutes: number;
  labour_rate_type: LabourRate["rate_type"];
  minimum_minutes?: number;
}

/** Top-level costing rules, one row per company. */
export interface CostingRules {
  standard_waste_percentage: number;     // 0–100, e.g. 10
  consumables_percentage: number;        // 0–100, e.g. 3
  overhead_percentage: number;           // 0–100, e.g. 0
  pricing_method: "margin" | "markup";
  default_margin_percentage: number;     // used by either method
  minimum_margin_percentage: number;
  minimum_order_value: number;
  rounding_enabled: boolean;
  rounding_unit: number;                  // e.g. 10 means round to nearest £10
  vat_registered: boolean;
  vat_rate: number;                       // e.g. 20
}

/** Bundle of all company costing data the engine needs. */
export interface CompanyCostingData {
  labour_rates: LabourRate[];
  material_rates: MaterialRate[];
  process_rates: ProcessRate[];
  costing_rules: CostingRules;
}

// ---------- Outputs ----------

export interface CostLine {
  label: string;
  amount: number;       // money
  detail?: string;      // optional human-readable explanation
}

export interface CostBreakdown {
  // Per-unit lines
  material_lines: CostLine[];
  labour_lines: CostLine[];

  // Subtotals (per unit)
  material_cost_per_unit: number;
  labour_cost_per_unit: number;
  consumables_cost_per_unit: number;
  build_cost_per_unit: number;
  overhead_cost_per_unit: number;
  total_cost_per_unit: number;

  // Totals (× quantity)
  quantity: number;
  total_build_cost: number;
  total_overhead_cost: number;
  total_cost_before_margin: number;

  // Pricing
  pricing_method: "margin" | "markup";
  margin_or_markup_percentage: number;
  sell_price_ex_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_inc_vat: number;
}

/** Snapshot of the rates used for this calc. Stored on every estimate. */
export interface CostingSnapshot {
  taken_at: string;       // ISO timestamp
  costing_rules: CostingRules;
  labour_rates: LabourRate[];
  material_rates_used: MaterialRate[];
  process_rates_used: ProcessRate[];
  engine_version: string;
}

export interface EstimateResult {
  ok: boolean;                       // false if validation_errors is non-empty
  breakdown: CostBreakdown | null;   // null when ok=false
  assumptions: string[];
  missing_information: string[];
  validation_errors: string[];
  snapshot: CostingSnapshot | null;
}
