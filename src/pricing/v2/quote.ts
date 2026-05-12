// Quote-level dispatcher + roll-up. Takes line items, dispatches each to the
// right product calculator, sums totals, applies VAT.

import type { CompanyCostingData } from "../types";
import type {
  AnyProductSpec,
  LineItemInput,
  LineItemResult,
  QuoteEngineLibrary,
  QuoteRollup,
} from "./types";
import { calculateBench } from "./products/bench";
import { calculateWorktop } from "./products/worktop";
import { calculateSplashback } from "./products/splashback";
import { calculateShelf } from "./products/shelf";
import { calculateCupboard } from "./products/cupboard";
import { calculateDripTray } from "./products/drip_tray";
import { round2 } from "./material";

export const ENGINE_VERSION_V2 = "0.2.0";

export function calculateLineItem(
  input: LineItemInput,
  library: QuoteEngineLibrary,
  company: CompanyCostingData
): LineItemResult {
  const { spec } = input;
  const common = {
    features: input.features,
    subcomponents: input.subcomponents,
    quantity: input.quantity,
    library, company,
    labour_hours_override: input.labour_hours_override,
    unit_price_override: input.unit_price_override,
  };

  switch (spec.product_type) {
    case "worktop":
      return calculateWorktop({ ...common, spec });
    case "splashback":
      return calculateSplashback({ ...common, spec });
    case "wall_bench":
    case "work_bench":
    case "mobile_bench":
    case "service_counter":
    case "sink_unit":
    case "dishwash_table":
      return calculateBench({ ...common, spec });
    case "wall_shelf":
    case "over_shelf":
    case "pot_shelf":
    case "basket_shelf":
      return calculateShelf({ ...common, spec });
    case "wall_cupboard":
    case "hot_cupboard":
    case "storage_cupboard":
      return calculateCupboard({ ...common, spec });
    case "drip_tray":
      return calculateDripTray({ ...common, spec });

    case "custom":
    case "free_text":
    case "delivery": {
      // Manual price — just record it.
      const unit_price = "manual_price_ex_vat" in spec
        ? (spec.manual_price_ex_vat ?? 0)
        : 0;
      const description = input.description_override ?? spec.description;
      return {
        ok: true,
        product_type: spec.product_type,
        description,
        breakdown: {
          material_lines: [], labour_lines: [],
          material_cost_per_unit: 0, labour_cost_per_unit: 0,
          consumables_cost_per_unit: 0, build_cost_per_unit: 0,
          overhead_cost_per_unit: 0, total_cost_per_unit: 0,
          pricing_method: company.costing_rules.pricing_method,
          margin_or_markup_percentage: 0,
          unit_price_ex_vat: round2(unit_price),
          line_total_ex_vat: round2(unit_price * input.quantity),
        },
        assumptions: [`Manual price for ${spec.product_type} line.`],
        missing_information: [], validation_errors: [],
      };
    }

    case "bought_in": {
      // Supplier list × (1 - disc) × (1 + markup)
      const cost = spec.supplier_list_price * (1 - spec.supplier_discount_pct / 100);
      const sell = cost * (1 + spec.markup_pct / 100);
      return {
        ok: true,
        product_type: "bought_in",
        description: spec.description,
        breakdown: {
          material_lines: [{
            label: `${spec.manufacturer ?? "Supplier"} ${spec.model ?? ""}`.trim(),
            amount: round2(cost),
            detail: `List £${spec.supplier_list_price} less ${spec.supplier_discount_pct}%`,
          }],
          labour_lines: [],
          material_cost_per_unit: round2(cost),
          labour_cost_per_unit: 0,
          consumables_cost_per_unit: 0,
          build_cost_per_unit: round2(cost),
          overhead_cost_per_unit: 0,
          total_cost_per_unit: round2(cost),
          pricing_method: "markup",
          margin_or_markup_percentage: spec.markup_pct,
          unit_price_ex_vat: round2(sell),
          line_total_ex_vat: round2(sell * input.quantity),
        },
        assumptions: [], missing_information: [], validation_errors: [],
      };
    }

    default: {
      // Should be unreachable now that all product types are handled.
      const unknown = spec as { product_type: string };
      return {
        ok: false,
        product_type: unknown.product_type as never,
        description: "",
        breakdown: null,
        assumptions: [],
        missing_information: [],
        validation_errors: [
          `Product type "${unknown.product_type}" is not yet implemented in the v2 engine.`,
        ],
      };
    }
  }
}

/** Roll up line item results into a quote total with VAT. */
export function rollUpQuote(
  line_results: LineItemResult[],
  company: CompanyCostingData
): QuoteRollup {
  const subtotal = line_results.reduce(
    (acc, r) => acc + (r.breakdown?.line_total_ex_vat ?? 0),
    0
  );
  const subtotal_ex_vat = round2(subtotal);
  const rules = company.costing_rules;
  const vat_rate = rules.vat_registered ? rules.vat_rate : 0;
  const vat_amount = round2(subtotal_ex_vat * (vat_rate / 100));
  const total_inc_vat = round2(subtotal_ex_vat + vat_amount);
  return { subtotal_ex_vat, vat_rate, vat_amount, total_inc_vat, line_results };
}
