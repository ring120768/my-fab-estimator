// Drip tray calculator — long thin pressed tray with perforated inserts.

import type { CompanyCostingData, CostLine } from "../../types";
import type {
  DripTraySpec,
  FeatureChoice,
  LineItemResult,
  QuoteEngineLibrary,
  SubcomponentChoice,
} from "../types";
import { applyFeatures } from "../features";
import { composeDescription } from "../description";
import { finishLabourMultiplier, findLabourRate } from "../labour";
import { findSheetRate, mmToM, round2, roundToUnit, withWaste } from "../material";

interface DripTrayInputs {
  spec: DripTraySpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  library: QuoteEngineLibrary;
  company: CompanyCostingData;
  labour_hours_override?: number;
  unit_price_override?: number;
}

function defaultLabourHours(spec: DripTraySpec): number {
  const lengthM = mmToM(spec.length_mm);
  let h = 0.5 + 0.6 * lengthM; // pressing + welding corners
  if (spec.perforated_inserts) h += 1.0 * lengthM; // perforating inserts
  h += spec.fixing_brackets * 0.15;
  return h;
}

export function calculateDripTray(input: DripTrayInputs): LineItemResult {
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
    return { ok: false, product_type: "drip_tray", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }

  const l = mmToM(spec.length_mm), d = mmToM(spec.depth_mm);
  // Tray = base + 4 sides (40mm high typical)
  const sideHeight = 0.04;
  const base_area = l * d;
  const side_area = 2 * l * sideHeight + 2 * d * sideHeight;
  const insert_area = spec.perforated_inserts ? base_area : 0;
  const total_area = withWaste(base_area + side_area + insert_area, rules.standard_waste_percentage);
  const sheet_cost = round2(total_area * sheetRate!.unit_cost);

  const material_lines: CostLine[] = [{
    label: `Drip tray sheet (${spec.material.grade}, ${spec.material.swg}swg)`,
    amount: sheet_cost,
    detail: `${round2(total_area)} m² @ £${sheetRate!.unit_cost}/m²`,
  }];

  const baseHours = input.labour_hours_override ?? defaultLabourHours(spec);
  const fabRate = findLabourRate("fabrication", company.labour_rates);
  if (!fabRate) {
    validation_errors.push("Missing labour rate: fabrication.");
    return { ok: false, product_type: "drip_tray", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  const polishRate = findLabourRate("polishing", company.labour_rates);
  const fabCost = round2(baseHours * fabRate.hourly_rate);
  const finishMult = finishLabourMultiplier(spec.material.finish);
  const polishHours = round2(base_area * 0.3);
  const polishCost = polishRate ? round2(polishHours * polishRate.hourly_rate * finishMult) : 0;

  const labour_lines: CostLine[] = [
    { label: "Fabrication", amount: fabCost, detail: `${round2(baseHours)} hrs @ £${fabRate.hourly_rate}/hr` },
  ];
  if (polishCost > 0) {
    labour_lines.push({ label: `Polishing (${spec.material.finish})`, amount: polishCost, detail: `${polishHours} hrs @ £${polishRate!.hourly_rate}/hr × ${finishMult}` });
  }

  const applied = applyFeatures(features, subcomponents, library, company, { finish: spec.material.finish });
  if (applied.errors.length) {
    validation_errors.push(...applied.errors);
    return { ok: false, product_type: "drip_tray", description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  if (applied.missing.length) missing_information.push(...applied.missing);
  material_lines.push(...applied.material_lines);
  labour_lines.push(...applied.labour_lines);

  const material_cost_per_unit = round2(sheet_cost + applied.material_cost);
  const labour_cost_per_unit = round2(fabCost + polishCost + applied.labour_cost);
  const consumables_cost_per_unit = round2((material_cost_per_unit + labour_cost_per_unit) * (rules.consumables_percentage / 100));
  const build_cost_per_unit = round2(material_cost_per_unit + labour_cost_per_unit + consumables_cost_per_unit);
  const overhead_cost_per_unit = round2(build_cost_per_unit * (rules.overhead_percentage / 100));
  const total_cost_per_unit = round2(build_cost_per_unit + overhead_cost_per_unit);

  const pct = rules.default_margin_percentage / 100;
  let pre_margin_sell: number;
  if (input.unit_price_override != null) {
    pre_margin_sell = input.unit_price_override;
    assumptions.push("Unit price manually overridden.");
  } else if (rules.pricing_method === "markup") {
    pre_margin_sell = total_cost_per_unit * (1 + pct);
  } else {
    pre_margin_sell = total_cost_per_unit / (1 - pct);
  }
  let unit_price_ex_vat = pre_margin_sell + applied.post_margin_cost;
  if (rules.rounding_enabled) unit_price_ex_vat = roundToUnit(unit_price_ex_vat, rules.rounding_unit);
  unit_price_ex_vat = round2(unit_price_ex_vat);
  const line_total_ex_vat = round2(unit_price_ex_vat * quantity);

  return {
    ok: true,
    product_type: "drip_tray",
    description: composeDescription(spec, features, subcomponents, library),
    breakdown: {
      material_lines, labour_lines,
      material_cost_per_unit, labour_cost_per_unit,
      consumables_cost_per_unit, build_cost_per_unit,
      overhead_cost_per_unit, total_cost_per_unit,
      pricing_method: rules.pricing_method,
      margin_or_markup_percentage: rules.default_margin_percentage,
      post_margin_lines: applied.post_margin_lines,
      post_margin_cost_per_unit: applied.post_margin_cost,
      unit_price_ex_vat, line_total_ex_vat,
    },
    assumptions, missing_information, validation_errors,
  };
}
