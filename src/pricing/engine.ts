// Deterministic pricing engine for stainless steel tables.
//
// Rules (per CLAUDE.md §2 and §8):
//  - Same input + same costing data → same output, every time.
//  - Never invent material/labour/process rates. Missing → validation_errors.
//  - Never hide missing rates. Surface them in missing_information too.
//  - Returns a structured cost breakdown, not just a final price.
//  - Builds a costing_snapshot of every rate used.

import type {
  CompanyCostingData,
  CostBreakdown,
  CostingSnapshot,
  CostLine,
  EstimateResult,
  TableSpec,
} from "./types";
import {
  findLabourRate,
  findMaterialRate,
  findProcessRate,
  processQuantity,
  round2,
  roundToUnit,
  tableGeometry,
} from "./helpers";

export const ENGINE_VERSION = "0.1.0-table";

export function calculateTableEstimate(
  spec: TableSpec,
  company: CompanyCostingData
): EstimateResult {
  const assumptions: string[] = [];
  const missing_information: string[] = [];
  const validation_errors: string[] = [];

  // ---------- Spec validation ----------
  if (!Number.isFinite(spec.quantity) || spec.quantity < 1)
    validation_errors.push("Quantity must be at least 1.");
  if (!Number.isFinite(spec.length_mm) || spec.length_mm <= 0)
    validation_errors.push("Length must be a positive number.");
  if (!Number.isFinite(spec.depth_mm) || spec.depth_mm <= 0)
    validation_errors.push("Depth must be a positive number.");
  if (!Number.isFinite(spec.height_mm) || spec.height_mm <= 0)
    validation_errors.push("Height must be a positive number.");
  if (!Number.isFinite(spec.number_of_legs) || spec.number_of_legs < 1)
    validation_errors.push("Number of legs must be at least 1.");
  if (spec.rear_upstand && spec.upstand_height_mm <= 0)
    validation_errors.push("Upstand height must be positive when rear upstand is enabled.");

  // ---------- Geometry ----------
  const rules = company.costing_rules;
  const geom = tableGeometry(spec, rules.standard_waste_percentage);

  // ---------- Material lookups ----------
  const sheetRate = findMaterialRate(company.material_rates, {
    category: "sheet",
    grade: spec.material_grade,
    thickness_mm: spec.sheet_thickness_mm,
  });
  if (!sheetRate) {
    const msg = `No sheet rate for grade ${spec.material_grade} at ${spec.sheet_thickness_mm}mm.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }

  const legRate = findMaterialRate(company.material_rates, {
    category: spec.leg_type,
    grade: spec.material_grade,
  });
  if (!legRate) {
    const msg = `No ${spec.leg_type} rate for grade ${spec.material_grade}.`;
    missing_information.push(msg);
    validation_errors.push(msg);
  }

  let footRate;
  if (spec.adjustable_feet) {
    footRate = findMaterialRate(company.material_rates, { category: "feet" });
    if (!footRate) {
      const msg = "No adjustable feet rate found.";
      missing_information.push(msg);
      validation_errors.push(msg);
    }
  }

  // Bail before pricing if anything required is missing.
  if (validation_errors.length > 0) {
    return {
      ok: false,
      breakdown: null,
      assumptions,
      missing_information,
      validation_errors,
      snapshot: null,
    };
  }

  // ---------- Material costs (per unit) ----------
  const sheetCost = round2(geom.sheet_area_with_waste_m2 * sheetRate!.unit_cost);
  const legCost = round2(geom.leg_length_total_m * legRate!.unit_cost);
  const feetCost = footRate
    ? round2(spec.number_of_legs * footRate.unit_cost)
    : 0;

  const material_lines: CostLine[] = [
    {
      label: `Stainless sheet (${sheetRate!.grade}, ${sheetRate!.thickness_mm}mm)`,
      amount: sheetCost,
      detail: `${round2(geom.sheet_area_with_waste_m2)} m² @ £${sheetRate!.unit_cost}/m² (incl. ${rules.standard_waste_percentage}% waste)`,
    },
    {
      label: `${spec.leg_type.replace("_", " ")} legs (${legRate!.grade ?? "n/a"})`,
      amount: legCost,
      detail: `${round2(geom.leg_length_total_m)} m @ £${legRate!.unit_cost}/m`,
    },
  ];
  if (footRate) {
    material_lines.push({
      label: "Adjustable feet",
      amount: feetCost,
      detail: `${spec.number_of_legs} × £${footRate.unit_cost}`,
    });
  }
  const material_cost_per_unit = round2(sheetCost + legCost + feetCost);

  // ---------- Labour / process costs (per unit) ----------
  const labour_lines: CostLine[] = [];
  let labour_cost_per_unit = 0;

  for (const process of company.process_rates) {
    const labourRate = findLabourRate(company.labour_rates, process.labour_rate_type);
    if (!labourRate) {
      const msg = `Missing labour rate for "${process.labour_rate_type}" required by ${process.process_name}.`;
      missing_information.push(msg);
      validation_errors.push(msg);
      continue;
    }

    const qty = processQuantity(process, geom);
    const minutes = Math.max(qty * process.time_minutes, process.minimum_minutes ?? 0);
    const cost = round2((minutes / 60) * labourRate.hourly_rate);

    labour_lines.push({
      label: `${process.process_name} (${process.basis})`,
      amount: cost,
      detail: `${round2(qty)} × ${process.time_minutes}min @ £${labourRate.hourly_rate}/hr = ${round2(minutes)}min`,
    });
    labour_cost_per_unit += cost;
  }
  labour_cost_per_unit = round2(labour_cost_per_unit);

  // If labour rates missing, bail.
  if (validation_errors.length > 0) {
    return {
      ok: false,
      breakdown: null,
      assumptions,
      missing_information,
      validation_errors,
      snapshot: null,
    };
  }

  // ---------- Consumables, overhead, build cost ----------
  const consumables_cost_per_unit = round2(
    (material_cost_per_unit + labour_cost_per_unit) *
      (rules.consumables_percentage / 100)
  );
  const build_cost_per_unit = round2(
    material_cost_per_unit + labour_cost_per_unit + consumables_cost_per_unit
  );
  const overhead_cost_per_unit = round2(
    build_cost_per_unit * (rules.overhead_percentage / 100)
  );
  const total_cost_per_unit = round2(build_cost_per_unit + overhead_cost_per_unit);

  // ---------- Totals × quantity ----------
  const total_build_cost = round2(build_cost_per_unit * spec.quantity);
  const total_overhead_cost = round2(overhead_cost_per_unit * spec.quantity);
  const total_cost_before_margin = round2(total_cost_per_unit * spec.quantity);

  // ---------- Margin / markup → sell price ----------
  const pct = rules.default_margin_percentage / 100;
  let sell_price_ex_vat: number;
  if (rules.pricing_method === "markup") {
    sell_price_ex_vat = total_cost_before_margin * (1 + pct);
  } else {
    // Margin on sell price: sell = cost / (1 - margin)
    if (pct >= 1)
      validation_errors.push("Margin percentage must be < 100% to compute a sell price.");
    sell_price_ex_vat = total_cost_before_margin / (1 - pct);
  }

  if (validation_errors.length > 0) {
    return {
      ok: false,
      breakdown: null,
      assumptions,
      missing_information,
      validation_errors,
      snapshot: null,
    };
  }

  // Min order value floor.
  if (sell_price_ex_vat < rules.minimum_order_value) {
    assumptions.push(
      `Sell price raised to minimum order value of £${rules.minimum_order_value}.`
    );
    sell_price_ex_vat = rules.minimum_order_value;
  }

  // Rounding.
  if (rules.rounding_enabled) {
    const rounded = roundToUnit(sell_price_ex_vat, rules.rounding_unit);
    if (rounded !== sell_price_ex_vat) {
      assumptions.push(`Sell price rounded to nearest £${rules.rounding_unit}.`);
    }
    sell_price_ex_vat = rounded;
  }

  sell_price_ex_vat = round2(sell_price_ex_vat);

  // ---------- VAT ----------
  const vat_amount = rules.vat_registered
    ? round2(sell_price_ex_vat * (rules.vat_rate / 100))
    : 0;
  const total_inc_vat = round2(sell_price_ex_vat + vat_amount);

  // ---------- Documented product assumptions ----------
  assumptions.push(
    `Sheet area uses ${rules.standard_waste_percentage}% waste factor.`,
    `Visible polishing area = top + ${spec.rear_upstand ? "upstand" : "no upstand"}.`,
    `${spec.construction === "welded" ? "Welded" : "Bolted"} construction: weld length ${round2(geom.weld_length_m)} m.`,
    `Fold count: ${geom.fold_count} (top edge${spec.rear_upstand ? " + upstand" : ""}${spec.undershelf ? " + undershelf" : ""}).`
  );

  // ---------- Snapshot ----------
  const snapshot: CostingSnapshot = {
    taken_at: new Date().toISOString(),
    costing_rules: rules,
    labour_rates: company.labour_rates,
    material_rates_used: [sheetRate!, legRate!, ...(footRate ? [footRate] : [])],
    process_rates_used: company.process_rates,
    engine_version: ENGINE_VERSION,
  };

  // ---------- Build the breakdown ----------
  const breakdown: CostBreakdown = {
    material_lines,
    labour_lines,
    material_cost_per_unit,
    labour_cost_per_unit,
    consumables_cost_per_unit,
    build_cost_per_unit,
    overhead_cost_per_unit,
    total_cost_per_unit,
    quantity: spec.quantity,
    total_build_cost,
    total_overhead_cost,
    total_cost_before_margin,
    pricing_method: rules.pricing_method,
    margin_or_markup_percentage: rules.default_margin_percentage,
    sell_price_ex_vat,
    vat_rate: rules.vat_registered ? rules.vat_rate : 0,
    vat_amount,
    total_inc_vat,
  };

  return {
    ok: true,
    breakdown,
    assumptions,
    missing_information,
    validation_errors,
    snapshot,
  };
}
