// Bench calculator — handles wall_bench, work_bench, mobile_bench,
// service_counter, sink_unit (all share the same base geometry + structure).
//
// Pure function. Geometry-based with feature uplifts.

import type { CompanyCostingData, CostLine } from "../../types";
import type {
  BenchSpec,
  FeatureChoice,
  LineItemBreakdown,
  LineItemResult,
  QuoteEngineLibrary,
  SubcomponentChoice,
} from "../types";
import { applyFeatures } from "../features";
import { composeDescription } from "../description";
import { finishLabourMultiplier, findLabourRate, minutesToHours } from "../labour";
import { findSheetRate, mmToM, round2, roundToUnit, withWaste } from "../material";

interface BenchInputs {
  spec: BenchSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  library: QuoteEngineLibrary;
  company: CompanyCostingData;
  labour_hours_override?: number;
  unit_price_override?: number;
}

/**
 * Default labour hours estimate by product. Calibrated from CCE costing data
 * medians (Q4 2025 – Q2 2026). Tunable via labour_hours_override.
 */
function defaultLabourHours(spec: BenchSpec): number {
  // Base hours scale gently with length.
  const lengthM = mmToM(spec.length_mm);
  const base = {
    wall_bench: 2.5 + 0.6 * lengthM,    // median ~3.5 hrs at 1.6m
    work_bench: 2.5 + 0.6 * lengthM,
    mobile_bench: 3.0 + 0.7 * lengthM,
    service_counter: 4.0 + 1.2 * lengthM, // long counters need more
    sink_unit: 3.0 + 0.8 * lengthM,
    dishwash_table: 3.5 + 0.8 * lengthM, // welded join, gulley, basket runners
  }[spec.product_type];

  // Structure modifier
  const structureBonus: Record<typeof spec.under_structure, number> = {
    open_no_panels: 0,
    open_with_base_shelf: 1.0,
    open_with_void: 0,
    open_with_mid_shelf: 1.5,
    cupboard_hinged: 2.0,
    cupboard_sliding: 2.5,
    drawer_bank: 3.5,
    lined_lockable: 3.0,
    mixed: 2.0,
  };
  return base + structureBonus[spec.under_structure];
}

export function calculateBench(input: BenchInputs): LineItemResult {
  const { spec, features, subcomponents, quantity, library, company } = input;
  const rules = company.costing_rules;

  const assumptions: string[] = [];
  const missing_information: string[] = [];
  const validation_errors: string[] = [];

  // ---------- Validate spec ----------
  if (quantity < 1) validation_errors.push("Quantity must be at least 1.");
  if (spec.length_mm <= 0) validation_errors.push("Length must be positive.");
  if (spec.depth_mm <= 0) validation_errors.push("Depth must be positive.");
  if (spec.height_mm <= 0) validation_errors.push("Height must be positive.");
  if (spec.number_of_legs < 2) validation_errors.push("Need at least 2 legs.");

  // ---------- Material: top sheet ----------
  const sheetRate = findSheetRate(spec.material, company.material_rates);
  if (!sheetRate) {
    const msg = `No sheet rate for grade ${spec.material.grade} at ${spec.material.swg}swg.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }

  // ---------- Legs ----------
  const legRate = company.material_rates.find(
    (m) => m.category === "box_section" && m.grade === spec.material.grade &&
           m.size_label?.startsWith(`${spec.leg_section_mm}x${spec.leg_section_mm}`)
  );
  if (!legRate) {
    const msg = `No ${spec.leg_section_mm}×${spec.leg_section_mm}mm box section rate for ${spec.material.grade}.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }

  if (validation_errors.length > 0) {
    return {
      ok: false,
      product_type: spec.product_type,
      description: "",
      breakdown: null,
      assumptions,
      missing_information,
      validation_errors,
    };
  }

  // ---------- Geometry ----------
  const length_m = mmToM(spec.length_mm);
  const depth_m = mmToM(spec.depth_mm);
  const height_m = mmToM(spec.height_mm);
  const upstand_m = mmToM(spec.upstand_size_mm || 0);

  const top_area_m2 = length_m * depth_m;
  const upstand_area_m2 = spec.upstand_size_mm > 0
    ? length_m * upstand_m * (spec.upstand_position === "rear_and_both_ends" ? 1 : 1) +
      (spec.upstand_position === "rear_and_both_ends" || spec.upstand_position === "rear_and_ends"
        ? 2 * depth_m * upstand_m : 0)
    : 0;

  // Polish area = top + upstand (visible faces)
  const polish_area_m2 = top_area_m2 + upstand_area_m2;
  const sheet_area_raw = top_area_m2 + upstand_area_m2;
  const sheet_area_with_waste = withWaste(sheet_area_raw, rules.standard_waste_percentage);

  const sheet_cost = round2(sheet_area_with_waste * sheetRate!.unit_cost);
  const leg_length_total_m = spec.number_of_legs * height_m;
  const leg_cost = round2(leg_length_total_m * legRate!.unit_cost);

  // ---------- Material lines ----------
  const material_lines: CostLine[] = [
    {
      label: `Top sheet (${spec.material.grade}, ${spec.material.swg}swg)`,
      amount: sheet_cost,
      detail: `${round2(sheet_area_with_waste)} m² @ £${sheetRate!.unit_cost}/m² (incl. ${rules.standard_waste_percentage}% waste)`,
    },
    {
      label: `Legs (${spec.leg_section_mm}×${spec.leg_section_mm} box section)`,
      amount: leg_cost,
      detail: `${round2(leg_length_total_m)} m × ${spec.number_of_legs} legs @ £${legRate!.unit_cost}/m`,
    },
  ];

  // ---------- Labour ----------
  const baseHours = input.labour_hours_override ?? defaultLabourHours(spec);
  const fabRate = findLabourRate("fabrication", company.labour_rates);
  if (!fabRate) {
    validation_errors.push("Missing labour rate: fabrication.");
    return earlyExit(spec, missing_information, validation_errors, assumptions);
  }
  const finishMult = finishLabourMultiplier(spec.material.finish);
  const polishRate = findLabourRate("polishing", company.labour_rates);
  if (polish_area_m2 > 0 && !polishRate) {
    validation_errors.push("Missing labour rate: polishing.");
    return earlyExit(spec, missing_information, validation_errors, assumptions);
  }

  const fabCost = round2(baseHours * fabRate.hourly_rate);
  // Polish hours: rule of thumb 0.5 hours per m² of visible surface.
  const polishHours = round2(polish_area_m2 * 0.5);
  const polishCost = polishRate ? round2(polishHours * polishRate.hourly_rate * finishMult) : 0;

  const labour_lines: CostLine[] = [
    {
      label: `Fabrication`,
      amount: fabCost,
      detail: `${round2(baseHours)} hrs @ £${fabRate.hourly_rate}/hr (${input.labour_hours_override != null ? "manual override" : "engine default for " + spec.product_type})`,
    },
  ];
  if (polishCost > 0) {
    labour_lines.push({
      label: `Polishing (${spec.material.finish})`,
      amount: polishCost,
      detail: `${polishHours} hrs @ £${polishRate!.hourly_rate}/hr × ${finishMult} finish multiplier`,
    });
  }

  // ---------- Apply features & sub-components ----------
  const applied = applyFeatures(features, subcomponents, library, company, {
    finish: spec.material.finish,
    bench_length_mm: spec.length_mm,
  });
  if (applied.errors.length) {
    validation_errors.push(...applied.errors);
    return earlyExit(spec, missing_information, validation_errors, assumptions);
  }
  if (applied.missing.length) {
    missing_information.push(...applied.missing);
    assumptions.push(`Unknown features/sub-components skipped: ${applied.missing.length}.`);
  }
  material_lines.push(...applied.material_lines);
  labour_lines.push(...applied.labour_lines);

  // ---------- Totals ----------
  // Pre-margin: sheet + legs + applied.material_cost (NOT catalogue sell-priced features)
  const material_cost_per_unit = round2(sheet_cost + leg_cost + applied.material_cost);
  const labour_cost_per_unit = round2(fabCost + polishCost + applied.labour_cost);
  const consumables_cost_per_unit = round2(
    (material_cost_per_unit + labour_cost_per_unit) * (rules.consumables_percentage / 100)
  );
  const build_cost_per_unit = round2(material_cost_per_unit + labour_cost_per_unit + consumables_cost_per_unit);
  const overhead_cost_per_unit = round2(build_cost_per_unit * (rules.overhead_percentage / 100));
  const total_cost_per_unit = round2(build_cost_per_unit + overhead_cost_per_unit);

  // Margin / markup applied ONLY to pre-margin costs
  const pct = rules.default_margin_percentage / 100;
  let pre_margin_sell: number;
  if (input.unit_price_override != null) {
    pre_margin_sell = input.unit_price_override;
    assumptions.push("Unit price manually overridden by estimator.");
  } else if (rules.pricing_method === "markup") {
    pre_margin_sell = total_cost_per_unit * (1 + pct);
  } else {
    if (pct >= 1) {
      validation_errors.push("Margin must be < 100%.");
      return earlyExit(spec, missing_information, validation_errors, assumptions);
    }
    pre_margin_sell = total_cost_per_unit / (1 - pct);
  }

  // Add post-margin catalogue sell-priced items DIRECTLY (no second markup)
  let unit_price_ex_vat = pre_margin_sell + applied.post_margin_cost;

  if (rules.rounding_enabled) {
    unit_price_ex_vat = roundToUnit(unit_price_ex_vat, rules.rounding_unit);
  }
  unit_price_ex_vat = round2(unit_price_ex_vat);
  const line_total_ex_vat = round2(unit_price_ex_vat * quantity);

  const breakdown: LineItemBreakdown = {
    material_lines,
    labour_lines,
    material_cost_per_unit,
    labour_cost_per_unit,
    consumables_cost_per_unit,
    build_cost_per_unit,
    overhead_cost_per_unit,
    total_cost_per_unit,
    pricing_method: rules.pricing_method,
    margin_or_markup_percentage: rules.default_margin_percentage,
    post_margin_lines: applied.post_margin_lines,
    post_margin_cost_per_unit: applied.post_margin_cost,
    unit_price_ex_vat,
    line_total_ex_vat,
  };

  return {
    ok: true,
    product_type: spec.product_type,
    description: composeDescription(spec, features, subcomponents, library),
    breakdown,
    assumptions,
    missing_information,
    validation_errors,
  };
}

function earlyExit(
  spec: BenchSpec,
  missing_information: string[],
  validation_errors: string[],
  assumptions: string[]
): LineItemResult {
  return {
    ok: false,
    product_type: spec.product_type,
    description: "",
    breakdown: null,
    assumptions,
    missing_information,
    validation_errors,
  };
}
