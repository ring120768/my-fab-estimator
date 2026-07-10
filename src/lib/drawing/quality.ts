// Compute a structured quality score for a parsed drawing.
// Same philosophy as src/lib/ai/quality.ts: we don't trust the extractor's
// self-assessment — we score objective signals and reject below threshold
// with structured advice. Also runs dimension sanity checks that catch unit
// errors and wild misreads.

import type {
  ParsedDrawing,
  DrawingQualityAssessment,
  DimensionedItem,
} from "./types";
import {
  DRAWING_QUALITY_ACCEPT_THRESHOLD,
  METHOD_RELIABILITY,
  DIMENSION_LIMITS_MM,
} from "./types";

function sanityCheck(item: DimensionedItem, warnings: string[]): void {
  const checks: [keyof typeof DIMENSION_LIMITS_MM, number | undefined][] = [
    ["length", item.length_mm],
    ["depth", item.depth_mm],
    ["height", item.height_mm],
  ];
  for (const [name, value] of checks) {
    if (value === undefined) continue;
    const { min, max } = DIMENSION_LIMITS_MM[name];
    if (value < min || value > max) {
      warnings.push(
        `"${item.label}": ${name} ${value}mm is outside the plausible range ` +
        `${min}–${max}mm — likely a unit error or misread. Verify before pricing.`
      );
    }
  }
}

export function assessDrawingQuality(
  drawing: ParsedDrawing
): DrawingQualityAssessment {
  const rejection_reasons: string[] = [];
  const warnings: string[] = [...drawing.general_warnings];
  const advice: string[] = [];

  // ---------- Items found? ----------
  const items_found = drawing.items.length;
  if (items_found === 0) {
    rejection_reasons.push("No dimensioned items found on the drawing.");
    advice.push(
      "The drawing has no readable dimension annotations. If it's drawn to " +
      "scale, use the calibrate-and-measure option: click two points on a " +
      "known dimension and enter its real size."
    );
  }

  // ---------- Dimension completeness ----------
  // "Fully dimensioned" = has length + depth. Height matters for benches and
  // cupboards but flat items (shelves, splashbacks, worktops) may not have
  // one — so height absence is a warning, not a completeness failure.
  let fullCount = 0;
  for (const item of drawing.items) {
    const hasLD = item.length_mm !== undefined && item.depth_mm !== undefined;
    if (hasLD) fullCount += 1;
    sanityCheck(item, warnings);
  }
  const dimension_completeness =
    items_found === 0 ? 0 : Math.round((fullCount / items_found) * 100);

  if (items_found > 0 && dimension_completeness < 50) {
    warnings.push(
      `Only ${fullCount} of ${items_found} items have both length and depth — ` +
      "expect manual entry or a calibration pass."
    );
    advice.push(
      "Consider requesting a DXF export from the drawing's author — DXF gives " +
      "exact dimensions for every item with no reading errors."
    );
  }

  // ---------- Scale declared? ----------
  const scale_declared = Boolean(drawing.drawing_metadata.scale);
  if (!scale_declared) {
    warnings.push(
      "No scale declared in the title block — if measuring is needed, manual " +
      "calibration will be required."
    );
  }

  // ---------- Method reliability ----------
  const method_reliability = METHOD_RELIABILITY[drawing.primary_method] ?? 0;

  // ---------- Composite score ----------
  // Weighted: completeness dominates, method reliability moderates, and the
  // extractor's self-assessment gets a small vote.
  const quality_score = Math.round(
    dimension_completeness * 0.55 +
    method_reliability * 0.3 +
    drawing.raw_confidence * 0.15
  );

  const acceptable =
    rejection_reasons.length === 0 &&
    quality_score >= DRAWING_QUALITY_ACCEPT_THRESHOLD;

  if (!acceptable && rejection_reasons.length === 0) {
    rejection_reasons.push(
      `Quality score ${quality_score} is below the accept threshold ` +
      `(${DRAWING_QUALITY_ACCEPT_THRESHOLD}).`
    );
  }

  return {
    quality_score,
    acceptable,
    components: {
      items_found,
      items_fully_dimensioned: fullCount,
      dimension_completeness,
      scale_declared,
      method_reliability,
    },
    rejection_reasons,
    warnings,
    advice,
  };
}
