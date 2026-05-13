// Apply selected features and sub-components to a line item.
//
// Two cost buckets returned:
//
//   • pre_margin: material_cost / labour_cost computed from material_cost +
//     labour_minutes fields on the library entry. These flow through the
//     normal pricing pipeline (consumables → build cost → overhead → margin).
//
//   • post_margin: when a feature/sub-component has a default_price (or
//     override_price), that value is treated as a customer-facing SELL price
//     already including any markup. It bypasses the margin pipeline and is
//     added directly to unit_price_ex_vat. This avoids double-marking-up
//     catalogue items.

import type {
  CompanyCostingData,
  CostLine,
} from "../types";
import type {
  FeatureChoice,
  FeatureLibraryEntry,
  QuoteEngineLibrary,
  SubcomponentChoice,
  SubcomponentLibraryEntry,
  Finish,
} from "./types";
import { findLabourRate, minutesToHours } from "./labour";
import { round2 } from "./material";

export interface AppliedFeatures {
  // Pre-margin: flow through margin pipeline
  material_lines: CostLine[];
  labour_lines: CostLine[];
  material_cost: number;
  labour_cost: number;
  // Post-margin: added directly to unit_price_ex_vat
  post_margin_lines: CostLine[];
  post_margin_cost: number;

  missing: string[];
  errors: string[];
}

export function applyFeatures(
  features: FeatureChoice[],
  subcomponents: SubcomponentChoice[],
  library: QuoteEngineLibrary,
  company: CompanyCostingData,
  context: { finish: Finish; bench_length_mm?: number }
): AppliedFeatures {
  const out: AppliedFeatures = {
    material_lines: [],
    labour_lines: [],
    material_cost: 0,
    labour_cost: 0,
    post_margin_lines: [],
    post_margin_cost: 0,
    missing: [],
    errors: [],
  };

  const featByCode = new Map<string, FeatureLibraryEntry>(
    library.features.map((f) => [f.code, f])
  );
  const subByCode = new Map<string, SubcomponentLibraryEntry>(
    library.subcomponents.map((s) => [s.code, s])
  );

  for (const fc of features) {
    const entry = featByCode.get(fc.code);
    if (!entry) {
      out.missing.push(`Feature not in library: ${fc.code}`);
      continue;
    }
    applyOne(out, entry, fc.quantity, fc.override_price, company, context);
  }

  for (const sc of subcomponents) {
    const entry = subByCode.get(sc.code);
    if (!entry) {
      out.missing.push(`Sub-component not in library: ${sc.code}`);
      continue;
    }
    applyOne(out, entry, sc.quantity, sc.override_price, company, context);
  }

  out.material_cost = round2(out.material_cost);
  out.labour_cost = round2(out.labour_cost);
  out.post_margin_cost = round2(out.post_margin_cost);
  return out;
}

function applyOne(
  out: AppliedFeatures,
  entry: FeatureLibraryEntry | SubcomponentLibraryEntry,
  quantity: number,
  override_price: number | undefined,
  company: CompanyCostingData,
  context: { finish: Finish }
) {
  // If override_price set OR default_price set, treat as a CUSTOMER-FACING
  // SELL PRICE that already includes any catalogue markup. Add directly to
  // post_margin_cost so the engine doesn't apply margin to it again.
  const flat = override_price ?? entry.default_price;
  if (flat != null) {
    const sellAmount = round2(flat * quantity);
    out.post_margin_lines.push({
      label: entry.name + (quantity > 1 ? ` × ${quantity}` : ""),
      amount: sellAmount,
      detail: `Catalogue sell price`,
    });
    out.post_margin_cost += sellAmount;
    return;
  }

  // Else compute from material_cost + labour_minutes (flows through margin)
  const material = round2(entry.material_cost * quantity);
  if (material > 0) {
    out.material_lines.push({
      label: entry.name + (quantity > 1 ? ` × ${quantity}` : ""),
      amount: material,
      detail: `Material allowance`,
    });
    out.material_cost += material;
  }

  if (entry.labour_minutes > 0) {
    const labourRate = findLabourRate(entry.labour_rate_type, company.labour_rates);
    if (!labourRate) {
      out.errors.push(
        `Missing labour rate "${entry.labour_rate_type}" required by ${entry.code}.`
      );
      return;
    }
    const total_minutes = entry.labour_minutes * quantity;
    const cost = round2(minutesToHours(total_minutes) * labourRate.hourly_rate);
    out.labour_lines.push({
      label: `${entry.name} (labour)`,
      amount: cost,
      detail: `${total_minutes} min @ £${labourRate.hourly_rate}/hr`,
    });
    out.labour_cost += cost;
  }
}
