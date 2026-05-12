// Cupboard calculator — wall_cupboard, hot_cupboard, storage_cupboard.

import type { CompanyCostingData, CostLine } from "../../types";
import type {
  CupboardSpec,
  FeatureChoice,
  LineItemResult,
  QuoteEngineLibrary,
  SubcomponentChoice,
} from "../types";
import { applyFeatures } from "../features";
import { composeDescription } from "../description";
import { finishLabourMultiplier, findLabourRate } from "../labour";
import { findSheetRate, mmToM, round2, roundToUnit, withWaste } from "../material";

interface CupboardInputs {
  spec: CupboardSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  library: QuoteEngineLibrary;
  company: CompanyCostingData;
  labour_hours_override?: number;
  unit_price_override?: number;
}

function defaultLabourHours(spec: CupboardSpec): number {
  const lengthM = mmToM(spec.length_mm);
  const base = {
    wall_cupboard: 2.5 + 0.7 * lengthM,
    storage_cupboard: 3.0 + 0.8 * lengthM,
    hot_cupboard: 5.0 + 1.0 * lengthM,   // wiring + insulation
  }[spec.product_type];

  // Door labour
  const doorHours = spec.doors === "none" ? 0
    : spec.doors === "hinged" ? 0.5 * spec.number_of_doors
    : spec.doors === "sliding" ? 0.8 * spec.number_of_doors
    : 0.7 * spec.number_of_doors; // passthrough

  // Shelf labour
  const shelfHours = spec.internal_shelves * (spec.adjustable_shelves ? 0.6 : 0.4);

  return base + doorHours + shelfHours;
}

export function calculateCupboard(input: CupboardInputs): LineItemResult {
  const { spec, features, subcomponents, quantity, library, company } = input;
  const rules = company.costing_rules;

  const assumptions: string[] = [];
  const missing_information: string[] = [];
  const validation_errors: string[] = [];

  if (quantity < 1) validation_errors.push("Quantity must be at least 1.");
  if (spec.length_mm <= 0) validation_errors.push("Length must be positive.");
  if (spec.depth_mm <= 0) validation_errors.push("Depth must be positive.");
  if (spec.height_mm <= 0) validation_errors.push("Height must be positive.");

  const sheetRate = findSheetRate(spec.material, company.material_rates);
  if (!sheetRate) {
    const msg = `No sheet rate for ${spec.material.grade} at ${spec.material.swg}swg.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }
  if (validation_errors.length > 0) {
    return { ok: false, product_type: spec.product_type, description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }

  // Approx panel area: top + bottom + 2 sides + back + (front if doors=none)
  const l = mmToM(spec.length_mm), d = mmToM(spec.depth_mm), h = mmToM(spec.height_mm);
  let panel_area = 2 * (l * d) + 2 * (d * h) + (l * h); // top+bottom + 2 sides + back
  if (spec.doors === "none") panel_area += l * h; // open front needs a closing panel
  // Internal shelves
  panel_area += spec.internal_shelves * l * d;

  const sheet_area_with_waste = withWaste(panel_area, rules.standard_waste_percentage);
  const sheet_cost = round2(sheet_area_with_waste * sheetRate!.unit_cost);

  const material_lines: CostLine[] = [{
    label: `Cupboard panels (${spec.material.grade}, ${spec.material.swg}swg)`,
    amount: sheet_cost,
    detail: `${round2(sheet_area_with_waste)} m² @ £${sheetRate!.unit_cost}/m²`,
  }];

  // Labour
  const baseHours = input.labour_hours_override ?? defaultLabourHours(spec);
  const fabRate = findLabourRate("fabrication", company.labour_rates);
  if (!fabRate) {
    validation_errors.push("Missing labour rate: fabrication.");
    return { ok: false, product_type: spec.product_type, description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  const polishRate = findLabourRate("polishing", company.labour_rates);
  if (!polishRate) {
    validation_errors.push("Missing labour rate: polishing.");
    return { ok: false, product_type: spec.product_type, description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  const fabCost = round2(baseHours * fabRate.hourly_rate);
  const finishMult = finishLabourMultiplier(spec.material.finish);
  // Polish: visible faces — front + sides
  const visibleArea = (l * h) + 2 * (d * h);
  const polishHours = round2(visibleArea * 0.4);
  const polishCost = round2(polishHours * polishRate.hourly_rate * finishMult);

  const labour_lines: CostLine[] = [
    { label: "Fabrication & assembly", amount: fabCost, detail: `${round2(baseHours)} hrs @ £${fabRate.hourly_rate}/hr` },
    { label: `Polishing (${spec.material.finish})`, amount: polishCost, detail: `${polishHours} hrs @ £${polishRate.hourly_rate}/hr × ${finishMult}` },
  ];

  // Features
  const applied = applyFeatures(features, subcomponents, library, company, { finish: spec.material.finish });
  if (applied.errors.length) {
    validation_errors.push(...applied.errors);
    return { ok: false, product_type: spec.product_type, description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  if (applied.missing.length) missing_information.push(...applied.missing);
  material_lines.push(...applied.material_lines);
  labour_lines.push(...applied.labour_lines);

  // Totals
  const material_cost_per_unit = round2(sheet_cost + applied.material_cost);
  const labour_cost_per_unit = round2(fabCost + polishCost + applied.labour_cost);
  const consumables_cost_per_unit = round2((material_cost_per_unit + labour_cost_per_unit) * (rules.consumables_percentage / 100));
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
    unit_price_ex_vat = total_cost_per_unit / (1 - pct);
  }
  if (rules.rounding_enabled) unit_price_ex_vat = roundToUnit(unit_price_ex_vat, rules.rounding_unit);
  unit_price_ex_vat = round2(unit_price_ex_vat);
  const line_total_ex_vat = round2(unit_price_ex_vat * quantity);

  return {
    ok: true,
    product_type: spec.product_type,
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
