// Apply selected features and sub-components to a line item.
//
// A feature uplifts material cost + labour cost. The library entry says what
// the uplift is in fundamental terms (material £, labour minutes). The engine
// converts labour minutes to £ using the company's hourly rate, then adds it
// in.

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
  material_lines: CostLine[];
  labour_lines: CostLine[];
  material_cost: number;
  labour_cost: number;
  missing: string[];           // codes not found in library
  errors: string[];            // labour rate missing etc.
}

/**
 * Compute the cost uplift from a set of feature choices and sub-component
 * choices. Returns separate material and labour line entries so the breakdown
 * can show the source.
 */
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
    missing: [],
    errors: [],
  };

  // Build code → entry lookup
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
  // If override_price set OR default_price set, treat as a flat sell price
  // and split it back into "material" for display purposes only.
  const flat = override_price ?? entry.default_price;
  if (flat != null) {
    const cost = round2(flat * quantity);
    out.material_lines.push({
      label: entry.name + (quantity > 1 ? ` × ${quantity}` : ""),
      amount: cost,
      detail: `Catalogue price`,
    });
    out.material_cost += cost;
    return;
  }

  // Else compute from material_cost + labour_minutes × hourly_rate
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
