// Pure helper functions for the pricing engine.
// No I/O, no AI. Same input → same output.

import type {
  LabourRate,
  MaterialRate,
  ProcessRate,
  TableSpec,
} from "./types";

/** mm → m */
export const mmToM = (mm: number): number => mm / 1000;

/** Round a money value to 2 dp to avoid floating-point drift in display. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Round sell price to nearest unit (e.g. £10). */
export const roundToUnit = (n: number, unit: number): number => {
  if (unit <= 0) return round2(n);
  return Math.round(n / unit) * unit;
};

/** Find a material rate or return undefined — never invent one. */
export function findMaterialRate(
  rates: MaterialRate[],
  query: {
    category: MaterialRate["category"];
    grade?: string;
    thickness_mm?: number;
    size_label?: string;
  }
): MaterialRate | undefined {
  return rates.find(
    (r) =>
      r.category === query.category &&
      (query.grade === undefined || r.grade === query.grade) &&
      (query.thickness_mm === undefined || r.thickness_mm === query.thickness_mm) &&
      (query.size_label === undefined || r.size_label === query.size_label)
  );
}

/** Find a labour rate by type. */
export function findLabourRate(
  rates: LabourRate[],
  rate_type: LabourRate["rate_type"]
): LabourRate | undefined {
  return rates.find((r) => r.rate_type === rate_type);
}

/** Find a process rate by name. */
export function findProcessRate(
  rates: ProcessRate[],
  name: ProcessRate["process_name"]
): ProcessRate | undefined {
  return rates.find((r) => r.process_name === name);
}

// ---------- Table-specific geometry ----------

export interface TableGeometry {
  top_area_m2: number;
  undershelf_area_m2: number;
  upstand_area_m2: number;
  raw_sheet_area_m2: number;
  sheet_area_with_waste_m2: number;
  visible_polish_area_m2: number;
  leg_length_total_m: number;
  weld_length_m: number;
  fold_count: number;
}

/**
 * Compute geometric quantities for a single table from its spec.
 *
 * Notes — these are documented product assumptions, not invented costs:
 *  - Welded construction adds the perimeter of the top edge as weld length.
 *  - Folds: 4 for the top edge (front/back/left/right). +2 if rear upstand.
 *    +4 if undershelf is folded (both add as documented assumptions).
 *  - Visible polish area = top + (upstand if present). Underside of undershelf
 *    is treated as non-visible.
 *
 * Time-per-process and waste-% live in company costing data — those are NOT
 * invented here, only the geometric counts are.
 */
export function tableGeometry(
  spec: TableSpec,
  standard_waste_percentage: number
): TableGeometry {
  const length_m = mmToM(spec.length_mm);
  const depth_m = mmToM(spec.depth_mm);
  const height_m = mmToM(spec.height_mm);
  const upstand_h_m = spec.rear_upstand ? mmToM(spec.upstand_height_mm) : 0;

  const top_area_m2 = length_m * depth_m;
  const undershelf_area_m2 = spec.undershelf ? length_m * depth_m : 0;
  const upstand_area_m2 = spec.rear_upstand ? length_m * upstand_h_m : 0;

  const raw_sheet_area_m2 = top_area_m2 + undershelf_area_m2 + upstand_area_m2;
  const waste_factor = standard_waste_percentage / 100;
  const sheet_area_with_waste_m2 = raw_sheet_area_m2 * (1 + waste_factor);

  const visible_polish_area_m2 = top_area_m2 + upstand_area_m2;

  const leg_length_total_m = spec.number_of_legs * height_m;

  // Weld length in metres. Welded construction: perimeter of top + leg joints.
  // Bolted construction: just leg joints (assumed 0.1m of weld each).
  const perimeter_m = 2 * (length_m + depth_m);
  const leg_joint_weld_m = spec.number_of_legs * 0.1;
  const weld_length_m =
    spec.construction === "welded"
      ? perimeter_m + leg_joint_weld_m
      : leg_joint_weld_m;

  // Fold count.
  let fold_count = 4; // top edge folds
  if (spec.rear_upstand) fold_count += 2;
  if (spec.undershelf) fold_count += 4;

  return {
    top_area_m2,
    undershelf_area_m2,
    upstand_area_m2,
    raw_sheet_area_m2,
    sheet_area_with_waste_m2,
    visible_polish_area_m2,
    leg_length_total_m,
    weld_length_m,
    fold_count,
  };
}

/** Quantity for a process given the table geometry. */
export function processQuantity(
  process: ProcessRate,
  geom: TableGeometry
): number {
  switch (process.basis) {
    case "per_item":
      return 1;
    case "per_metre":
      // Used for welding (weld length).
      if (process.process_name === "welding") return geom.weld_length_m;
      return 1;
    case "per_fold":
      return geom.fold_count;
    case "per_m2":
      // Used for polishing (visible area).
      if (process.process_name === "polishing") return geom.visible_polish_area_m2;
      return geom.top_area_m2;
  }
}
