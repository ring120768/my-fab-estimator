// Test fixtures: a realistic set of company costing data and a spec.
// Keep numbers simple so calcs are easy to verify by hand.

import type { CompanyCostingData, TableSpec } from "../types";

export const SAMPLE_COMPANY: CompanyCostingData = {
  labour_rates: [
    { rate_type: "fabrication", hourly_rate: 45 },
    { rate_type: "welding", hourly_rate: 55 },
    { rate_type: "polishing", hourly_rate: 50 },
    { rate_type: "cad", hourly_rate: 60 },
    { rate_type: "installation", hourly_rate: 65 },
  ],
  material_rates: [
    { category: "sheet", grade: "304", thickness_mm: 1.2, unit: "m2", unit_cost: 80 },
    { category: "sheet", grade: "304", thickness_mm: 1.5, unit: "m2", unit_cost: 95 },
    { category: "box_section", grade: "304", size_label: "30x30mm", unit: "metre", unit_cost: 12 },
    { category: "tube", grade: "304", size_label: "38mm", unit: "metre", unit_cost: 14 },
    { category: "feet", unit: "each", unit_cost: 5 },
  ],
  process_rates: [
    { process_name: "cutting", basis: "per_item", time_minutes: 15, labour_rate_type: "fabrication" },
    { process_name: "folding", basis: "per_fold", time_minutes: 5, labour_rate_type: "fabrication" },
    { process_name: "welding", basis: "per_metre", time_minutes: 20, labour_rate_type: "welding" },
    { process_name: "polishing", basis: "per_m2", time_minutes: 30, labour_rate_type: "polishing" },
    { process_name: "assembly", basis: "per_item", time_minutes: 30, labour_rate_type: "fabrication" },
    { process_name: "packing", basis: "per_item", time_minutes: 15, labour_rate_type: "fabrication" },
  ],
  costing_rules: {
    standard_waste_percentage: 10,
    consumables_percentage: 3,
    overhead_percentage: 0,
    pricing_method: "margin",
    default_margin_percentage: 30,
    minimum_margin_percentage: 20,
    minimum_order_value: 0,
    rounding_enabled: false,
    rounding_unit: 10,
    vat_registered: true,
    vat_rate: 20,
  },
};

/** A 1800 × 700 × 900mm 304/1.2mm welded table with undershelf, no upstand. */
export const SAMPLE_TABLE: TableSpec = {
  quantity: 1,
  length_mm: 1800,
  depth_mm: 700,
  height_mm: 900,
  material_grade: "304",
  sheet_thickness_mm: 1.2,
  finish: "brushed",
  undershelf: true,
  rear_upstand: false,
  upstand_height_mm: 0,
  leg_type: "box_section",
  number_of_legs: 4,
  adjustable_feet: true,
  construction: "welded",
};
