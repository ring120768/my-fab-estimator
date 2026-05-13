// Shelf calculator — handles wall_shelf, over_shelf, pot_shelf, basket_shelf.
// Wall-mounted by default. Brackets and rods optional.

import type { CompanyCostingData, CostLine } from "../../types";
import type {
  FeatureChoice,
  LineItemBreakdown,
  LineItemResult,
  QuoteEngineLibrary,
  ShelfSpec,
  SubcomponentChoice,
} from "../types";
import { applyFeatures } from "../features";
import { composeDescription } from "../description";
import { finishLabourMultiplier, findLabourRate } from "../labour";
import { findSheetRate, mmToM, round2, roundToUnit, withWaste } from "../material";

interface ShelfInputs {
  spec: ShelfSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  quantity: number;
  library: QuoteEngineLibrary;
  company: CompanyCostingData;
  labour_hours_override?: number;
  unit_price_override?: number;
}

function defaultLabourHours(spec: ShelfSpec): number {
  const lengthM = mmToM(spec.length_mm);
  // Wall shelves are very simple; over_shelf w/ supports more.
  const base = {
    wall_shelf: 0.6 + 0.25 * lengthM,
    over_shelf: 1.5 + 0.6 * lengthM,
    pot_shelf: 1.2 + 0.4 * lengthM,         // rods take a while
    basket_shelf: 1.6 + 0.5 * lengthM,      // angled + dividers
  }[spec.product_type];
  return base * spec.tiers;
}

export function calculateShelf(input: ShelfInputs): LineItemResult {
  const { spec, features, subcomponents, quantity, library, company } = input;
  const rules = company.costing_rules;

  const assumptions: string[] = [];
  const missing_information: string[] = [];
  const validation_errors: string[] = [];

  if (quantity < 1) validation_errors.push("Quantity must be at least 1.");
  if (spec.length_mm <= 0) validation_errors.push("Length must be positive.");
  if (spec.depth_mm <= 0) validation_errors.push("Depth must be positive.");
  if (spec.tiers < 1 || spec.tiers > 3) validation_errors.push("Tiers must be 1-3.");

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

  const length_m = mmToM(spec.length_mm);
  const depth_m = mmToM(spec.depth_mm);
  // Pot/basket shelves with rods use ~40% less sheet area
  const sheetMultiplier = (spec.rodded || spec.angled) ? 0.6 : 1.0;
  const tier_area_m2 = length_m * depth_m * sheetMultiplier;
  const total_area_m2 = tier_area_m2 * spec.tiers;
  const sheet_area_with_waste = withWaste(total_area_m2, rules.standard_waste_percentage);
  const sheet_cost = round2(sheet_area_with_waste * sheetRate!.unit_cost);

  // Brackets: standard 30×30 wall brackets, 2 per metre of length, default included.
  const wantBrackets = spec.wall_brackets ?? true;
  let bracket_cost = 0;
  if (wantBrackets) {
    const bracketRate = company.material_rates.find(
      (m) => m.category === "box_section" && m.size_label?.startsWith("30x30")
    );
    if (bracketRate) {
      const total_bracket_length_m = Math.max(2, Math.ceil(spec.length_mm / 1000) * 2) * 0.15 * spec.tiers; // 0.15m per bracket
      bracket_cost = round2(total_bracket_length_m * bracketRate.unit_cost);
    }
  }

  const material_lines: CostLine[] = [{
    label: `${spec.tiers} tier ${spec.product_type.replace("_", " ")} sheet`,
    amount: sheet_cost,
    detail: `${round2(sheet_area_with_waste)} m² @ £${sheetRate!.unit_cost}/m²`,
  }];
  if (bracket_cost > 0) {
    material_lines.push({ label: "Wall brackets (30×30)", amount: bracket_cost, detail: "Bracketing allowance" });
  }

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
  const polishHours = round2(total_area_m2 * 0.4);
  const polishCost = round2(polishHours * polishRate.hourly_rate * finishMult);

  const labour_lines: CostLine[] = [
    { label: "Fabrication", amount: fabCost, detail: `${round2(baseHours)} hrs @ £${fabRate.hourly_rate}/hr` },
    { label: `Polishing (${spec.material.finish})`, amount: polishCost, detail: `${polishHours} hrs @ £${polishRate.hourly_rate}/hr × ${finishMult}` },
  ];

  // Features & subs (rare on shelves but possible)
  const applied = applyFeatures(features, subcomponents, library, company, { finish: spec.material.finish });
  if (applied.errors.length) {
    validation_errors.push(...applied.errors);
    return { ok: false, product_type: spec.product_type, description: "", breakdown: null,
      assumptions, missing_information, validation_errors };
  }
  if (applied.missing.length) missing_information.push(...applied.missing);
  material_lines.push(...applied.material_lines);
  labour_lines.push(...applied.labour_lines);

  const material_cost_per_unit = round2(sheet_cost + bracket_cost + applied.material_cost);
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
    product_type: spec.product_type,
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
