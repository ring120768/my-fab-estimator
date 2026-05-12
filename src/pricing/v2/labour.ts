// Labour rate lookups + finish-aware adjustments.

import type {
  CompanyCostingData,
  LabourRate,
} from "../types";
import type { Finish } from "./types";

export function findLabourRate(
  rate_type: LabourRate["rate_type"],
  rates: LabourRate[]
): LabourRate | null {
  return rates.find((r) => r.rate_type === rate_type) ?? null;
}

/**
 * Polishing labour for "mirror" finish runs at 2× the polishing rate
 * (CCE uses LABOUR-110 at £184/hr vs LABOUR-105 at £92/hr).
 * Returns a multiplier on the labour line.
 */
export function finishLabourMultiplier(finish: Finish): number {
  if (finish === "mirror") return 2;
  if (finish === "burnished") return 1.25; // ~25% more hand-finishing than brushed
  return 1;
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}
