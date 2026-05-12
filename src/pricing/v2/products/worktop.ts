// Standalone worktop calculator — for worktops priced as their own line
// (separate from a bench). Most worktops are part of a bench; this calculator
// is for the "TOP 01: 16swg..." pattern from CCE quotes.

import type { CompanyCostingData, CostLine } from "../../types";
import type {
  FeatureChoice,
  LineItemBreakdown,
  LineItemResult,
  QuoteEngineLibrary,
  SubcomponentChoice,
  WorktopSpec,
} from "../types";
import { applyFeatures } from "../features";
import { composeDescription } from "../description";
import { finishLabourMultiplier, findLabourRate } from "../labour";
import { findSheetRate, mmToM, round2, roundToUnit, withWaste } from "../material";

interface WorktopInputs {
  spec: WorktopSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  library: QuoteEngineLibrary;
  company: CompanyCostingData;
  labour_hours_override?: number;
  unit_price_override?: number;
}

function defaultLabourHours(spec: WorktopSpec): number {
  // Base = 1.5 hrs + 0.5 hr/metre of length.
  const lengthM = mmToM(spec.length_mm);
  let h = 1.5 + 0.5 * lengthM;
  if (spec.downturn_all_sides) h += 0.5;
  if (spec.upstand_size_mm > 0) h += 0.5;
  return h;
}

export function calculateWorktop(input: WorktopInputs): LineItemResult {
  const { spec, features, subcomponents, quantity, library, company } = input;
  const rules = company.costing_rules;

  const assumptions: string[] = [];
  const missing_information: string[] = [];
  const validation_errors: string[] = [];

  if (quantity < 1) validation_errors.push("Quantity must be at least 1.");
  if (spec.length_mm <= 0) validation_errors.push("Length must be positive.");
  if (spec.depth_mm <= 0) validation_errors.push("Depth must be positive.");

  const sheetRate = findSheetRate(spec.material, company.material_rates);
  if (!sheetRate) {
    const msg = `No sheet rate for ${spec.material.grade} at ${spec.material.swg}swg.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }

  if (validation_errors.length > 0) {
    return { ok: false, product_type: "worktop", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }

  const length_m = mmToM(spec.length_mm);
  const depth_m = mmToM(spec.depth_mm);
  const upstand_m = mmToM(spec.upstand_size_mm || 0);

  const top_area_m2 = length_m * depth_m;
  const upstand_area_m2 = spec.upstand_size_mm > 0
    ? length_m * upstand_m + (spec.upstand_position === "rear_and_ends" ? 2 * depth_m * upstand_m : 0)
    : 0;
  const sheet_area_raw = top_area_m2 + upstand_area_m2;
  const sheet_area_with_waste = withWaste(sheet_area_raw, rules.standard_waste_percentage);

  const sheet_cost = round2(sheet_area_with_waste * sheetRate!.unit_cost);
  const polish_area_m2 = top_area_m2 + upstand_area_m2;

  const material_lines: CostLine[] = [{
    label: `Worktop sheet (${spec.material.grade}, ${spec.material.swg}swg)`,
    amount: sheet_cost,
    detail: `${round2(sheet_area_with_waste)} m² @ £${sheetRate!.unit_cost}/m²`,
  }];

  // Labour
  const baseHours = input.labour_hours_override ?? defaultLabourHours(spec);
  const fabRate = findLabourRate("fabrication", company.labour_rates);
  if (!fabRate) {
    validation_errors.push("Missing labour rate: fabrication.");
    return { ok: false, product_type: "worktop", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  const polishRate = findLabourRate("polishing", company.labour_rates);
  if (polish_area_m2 > 0 && !polishRate) {
    validation_errors.push("Missing labour rate: polishing.");
    return { ok: false, product_type: "worktop", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }

  const fabCost = round2(baseHours * fabRate.hourly_rate);
  const finishMult = finishLabourMultiplier(spec.material.finish);
  const polishHours = round2(polish_area_m2 * 0.4);
  const polishCost = polishRate ? round2(polishHours * polishRate.hourly_rate * finishMult) : 0;

  const labour_lines: CostLine[] = [{
    label: "Fabrication",
    amount: fabCost,
    detail: `${round2(baseHours)} hrs @ £${fabRate.hourly_rate}/hr`,
  }];
  if (polishCost > 0) {
    labour_lines.push({
      label: `Polishing (${spec.material.finish})`,
      amount: polishCost,
      detail: `${polishHours} hrs @ £${polishRate!.hourly_rate}/hr × ${finishMult}`,
    });
  }

  // Features & subs
  const applied = applyFeatures(features, subcomponents, library, company, { finish: spec.material.finish });
  if (applied.errors.length) {
    validation_errors.push(...applied.errors);
    return { ok: false, product_type: "worktop", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  if (applied.missing.length) {
    missing_information.push(...applied.missing);
  }
  material_lines.push(...applied.material_lines);
  labour_lines.push(...applied.labour_lines);

  // Totals
  const material_cost_per_unit = round2(sheet_cost + applied.material_cost);
  const labour_cost_per_unit = round2(fabCost + polishCost + applied.labour_cost);
  const consumables_cost_per_unit = round2(
    (material_cost_per_unit + labour_cost_per_unit) * (rules.consumables_percentage / 100)
  );
  const build_cost_per_unit = round2(material_cost_per_unit + labour_cost_per_unit + consumables_cost_per_unit);
  const overhead_cost_per_unit = round2(build_cost_per_unit * (rules.overhead_percentage / 100));
  const total_cost_per_unit = round2(build_cost_per_unit + overhead_cost_per_unit);

  const pct = rules.default_margin_percentage / 100;
  let unit_price_ex_vat: number;
  if (input.unit_price_override != null) {
    unit_price_ex_vat = input.unit_price_override;
    assumptions.push("Unit price manually overridden.");
  } else if (rules.pricing_method === "markup") {
    unit_price_ex_vat = total_cost_per_unit * (1 + pct);
  } else {
    if (pct >= 1) {
      validation_errors.push("Margin must be < 100%.");
      return { ok: false, product_type: "worktop", description: "", breakdown: null,
        assumptions, missing_information, validation_errors };
    }
    unit_price_ex_vat = total_cost_per_unit / (1 - pct);
  }
  if (rules.rounding_enabled) unit_price_ex_vat = roundToUnit(unit_price_ex_vat, rules.rounding_unit);
  unit_price_ex_vat = round2(unit_price_ex_vat);
  const line_total_ex_vat = round2(unit_price_ex_vat * quantity);

  return {
    ok: true,
    product_type: "worktop",
    description: composeDescription(spec, features, subcomponents, library),
    breakdown: {
      material_lines, labour_lines,
      material_cost_per_unit, labour_cost_per_unit,
      consumables_cost_per_unit, build_cost_per_unit,
      overhead_cost_per_unit, total_cost_per_unit,
      pricing_method: rules.pricing_method,
      margin_or_markup_percentage: rules.default_margin_percentage,
      unit_price_ex_vat, line_total_ex_vat,
    },
    assumptions, missing_information, validation_errors,
  };
}
