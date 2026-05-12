import type { CompanyCostingData } from "../../types";
import type { QuoteEngineLibrary } from "../types";

export const SAMPLE_COMPANY: CompanyCostingData = {
  labour_rates: [
    { rate_type: "fabrication", hourly_rate: 45 },
    { rate_type: "welding",     hourly_rate: 55 },
    { rate_type: "polishing",   hourly_rate: 50 },
    { rate_type: "cad",         hourly_rate: 60 },
    { rate_type: "installation",hourly_rate: 65 },
  ],
  material_rates: [
    { category: "sheet", grade: "304", thickness_mm: 1.2, unit: "m2", unit_cost: 80 },
    { category: "sheet", grade: "304", thickness_mm: 1.5, unit: "m2", unit_cost: 95 },
    { category: "sheet", grade: "304", thickness_mm: 2.0, unit: "m2", unit_cost: 130 },
    { category: "sheet", grade: "316", thickness_mm: 1.2, unit: "m2", unit_cost: 110 },
    { category: "box_section", grade: "304", size_label: "30x30mm", unit: "metre", unit_cost: 12 },
    { category: "box_section", grade: "304", size_label: "25x25mm", unit: "metre", unit_cost: 9 },
    { category: "box_section", grade: "304", size_label: "40x40mm", unit: "metre", unit_cost: 18 },
    { category: "tube", grade: "304", size_label: "38mm", unit: "metre", unit_cost: 14 },
    { category: "feet", unit: "each", unit_cost: 5 },
  ],
  process_rates: [],
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

export const SAMPLE_LIBRARY: QuoteEngineLibrary = {
  features: [
    {
      code: "SB500X400X300", name: "Sink bowl 500×400×300",
      applies_to: ["worktop","sink_unit","wall_bench","work_bench"],
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "welding",
      default_price: 434, unit_basis: "per_item",
    },
    {
      code: "ADE_LOCAL", name: "Local anti-drip edge",
      applies_to: ["worktop","wall_bench","work_bench","sink_unit"],
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "fabrication",
      default_price: 240, unit_basis: "per_item",
    },
    {
      code: "VALANCE", name: "Valance",
      applies_to: ["service_counter","sink_unit","wall_bench","work_bench"],
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "fabrication",
      default_price: 102, unit_basis: "per_item",
    },
    {
      code: "CASTORS", name: "Castors (set of 4)",
      applies_to: ["mobile_bench","work_bench"],
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "fabrication",
      default_price: 84, unit_basis: "per_item",
    },
  ],
  subcomponents: [
    {
      code: "SHELF_900", name: "Shelf 900",
      applies_to: ["wall_bench","work_bench"],
      size_label: "900",
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "fabrication",
      default_price: 96,
    },
    {
      code: "END_FRAME_900", name: "End frame 900",
      applies_to: ["wall_bench","work_bench","service_counter"],
      size_label: "900",
      material_cost: 0, labour_minutes: 0,
      labour_rate_type: "fabrication",
      default_price: 86,
    },
  ],
};
