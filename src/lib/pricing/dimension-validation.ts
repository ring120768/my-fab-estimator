// Sanity checks on user-entered dimensions to catch typos.
// Returns a small report with errors (clearly wrong) and warnings
// (suspicious but might be intentional, e.g. a tiny drip tray).

export interface DimensionCheck {
  errors: string[];   // clearly wrong — block save
  warnings: string[]; // suspicious — flag but allow
}

export interface DimensionLimits {
  min: number;
  max: number;
  typical_min: number;
  typical_max: number;
  label: string;
}

// Per-product-type plausible ranges (all in mm).
// `min/max` is the absolute physically-plausible range.
// `typical_min/max` is the everyday range — outside this we warn but don't block.
const DIMENSION_LIMITS: Record<string, {
  length: DimensionLimits;
  depth: DimensionLimits;
  height: DimensionLimits;
}> = {
  default: {
    length: { min: 100,  max: 8000, typical_min: 400,  typical_max: 4000, label: "length" },
    depth:  { min: 50,   max: 2000, typical_min: 200,  typical_max: 1200, label: "depth"  },
    height: { min: 100,  max: 3000, typical_min: 600,  typical_max: 1100, label: "height" },
  },
  // Drip trays are deliberately thin and shallow
  drip_tray: {
    length: { min: 200,  max: 6000, typical_min: 400,  typical_max: 4000, label: "length" },
    depth:  { min: 50,   max: 600,  typical_min: 100,  typical_max: 400,  label: "depth"  },
    height: { min: 10,   max: 100,  typical_min: 20,   typical_max: 50,   label: "height" },
  },
  // Splashbacks are wall-height not floor-standing
  splashback: {
    length: { min: 200,  max: 6000, typical_min: 400,  typical_max: 4000, label: "length" },
    depth:  { min: 1,    max: 50,   typical_min: 1,    typical_max: 5,    label: "thickness" },
    height: { min: 100,  max: 3000, typical_min: 300,  typical_max: 1500, label: "wall height" },
  },
  // Wall / over / pot / basket shelves
  wall_shelf: {
    length: { min: 200,  max: 4000, typical_min: 400,  typical_max: 3000, label: "length" },
    depth:  { min: 100,  max: 600,  typical_min: 200,  typical_max: 500,  label: "depth"  },
    height: { min: 50,   max: 2500, typical_min: 200,  typical_max: 1800, label: "height" },
  },
};

function limitsFor(productType: string) {
  return DIMENSION_LIMITS[productType] ?? DIMENSION_LIMITS.default!;
}

/**
 * Check a single dimension value against its plausible range.
 * Detects:
 *   - zero or negative
 *   - obviously-tiny (likely missed a zero — e.g. 10mm instead of 100mm)
 *   - obviously-huge (likely added a zero)
 *   - outside the "typical" range (warns)
 */
function checkOne(
  value: number | undefined,
  limits: DimensionLimits,
  out: DimensionCheck
) {
  if (value == null) return;
  if (!Number.isFinite(value) || value <= 0) {
    out.errors.push(`${limits.label} must be a positive number.`);
    return;
  }
  if (value < limits.min) {
    out.errors.push(
      `${limits.label} of ${value}mm looks like a typo — likely you meant ${value * 10}mm or ${value * 100}mm.`
    );
    return;
  }
  if (value > limits.max) {
    out.errors.push(
      `${limits.label} of ${value}mm looks like a typo — likely you meant ${Math.round(value / 10)}mm.`
    );
    return;
  }
  if (value < limits.typical_min) {
    out.warnings.push(
      `${limits.label} of ${value}mm is unusually small — typical range is ${limits.typical_min}–${limits.typical_max}mm. Check this is intentional.`
    );
  } else if (value > limits.typical_max) {
    out.warnings.push(
      `${limits.label} of ${value}mm is unusually large — typical range is ${limits.typical_min}–${limits.typical_max}mm. Check this is intentional.`
    );
  }
}

/**
 * Run sanity checks across length / depth / height for a given product type.
 * Returns { errors, warnings } — both as plain English strings ready to render.
 */
export function checkDimensions(
  productType: string,
  spec: { length_mm?: number; depth_mm?: number; height_mm?: number }
): DimensionCheck {
  const out: DimensionCheck = { errors: [], warnings: [] };
  const limits = limitsFor(productType);
  checkOne(spec.length_mm, limits.length, out);
  checkOne(spec.depth_mm, limits.depth, out);
  checkOne(spec.height_mm, limits.height, out);
  return out;
}
