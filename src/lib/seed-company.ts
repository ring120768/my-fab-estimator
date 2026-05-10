// Default seed data for first-run. Same numbers as the pricing engine fixtures
// so the demo calc matches what the user sees in the UI.

import type { CompanyCostingData } from "@/pricing/types";

export const SEED_COMPANY: CompanyCostingData = {
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
    { category: "sheet", grade: "316", thickness_mm: 1.2, unit: "m2", unit_cost: 110 },
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
