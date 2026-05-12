// Sheet area + cost helpers for v2 product calculators.
// Keeps the geometry-engine principle: same input → same output.

import type {
  CompanyCostingData,
  MaterialRate,
} from "../types";
import type { MaterialSpec } from "./types";

/** swg → mm */
export const swgToMm = (swg: number): number => {
  switch (swg) {
    case 18: return 1.2;
    case 16: return 1.5;
    case 14: return 2.0;
    case 10: return 3.0;
    default: return 1.2;
  }
};

/** Find a sheet rate (per m²) for the given material spec.
 *  Returns null if missing — engine surfaces this as a validation error. */
export function findSheetRate(
  spec: MaterialSpec,
  material_rates: MaterialRate[]
): MaterialRate | null {
  const thickness = swgToMm(spec.swg);
  // Try exact grade + thickness
  const exact = material_rates.find(
    (m) =>
      m.category === "sheet" &&
      m.grade === spec.grade &&
      m.thickness_mm !== undefined &&
      Math.abs(m.thickness_mm - thickness) < 0.05
  );
  if (exact) return exact;
  return null;
}

/** Apply standard waste % to a raw sheet area. */
export const withWaste = (area_m2: number, waste_pct: number) =>
  area_m2 * (1 + waste_pct / 100);

/** Round to 2 dp for money. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Round to nearest unit (10, 50 etc.). */
export const roundToUnit = (n: number, unit: number): number => {
  if (unit <= 0) return round2(n);
  return Math.round(n / unit) * unit;
};

/** mm → m */
export const mmToM = (mm: number): number => mm / 1000;
