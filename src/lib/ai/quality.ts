// Compute a structured quality score for a parsed schedule.
// We don't trust the AI's self-assessment alone — we compute our own score
// from objective signals (metadata completeness, per-item completeness, etc.)
// and reject below threshold with structured advice.

import type {
  ParsedSchedule,
  QualityAssessment,
} from "./types";
import { QUALITY_ACCEPT_THRESHOLD } from "./types";

export function assessQuality(schedule: ParsedSchedule): QualityAssessment {
  const rejection_reasons: string[] = [];
  const warnings: string[] = [];
  const advice: string[] = [];

  // ---------- Metadata completeness ----------
  const meta = schedule.drawing_metadata;
  const metaFields = [
    meta.project_name, meta.client_name, meta.site_address,
    meta.drawing_number, meta.revision, meta.scale,
  ];
  const metaPresent = metaFields.filter(Boolean).length;
  const metadata_completeness = Math.round((metaPresent / metaFields.length) * 100);

  if (!meta.drawing_number) warnings.push("Drawing number not detected — quote reference will need manual entry.");
  if (!meta.client_name) warnings.push("Client name not detected — will need manual entry on the quote.");

  // ---------- Schedule table present? ----------
  const schedule_table_present = schedule.line_items.length > 0;
  if (!schedule_table_present) {
    rejection_reasons.push("No equipment schedule table found in the drawing.");
    advice.push(
      "Drawings must include a tabular equipment schedule with Item / Qty / Manufacturer / Model / Description columns. " +
      "Please re-upload a drawing that includes a complete schedule."
    );
  }

  // ---------- Drawing key present? ----------
  // We infer "drawing key present" from whether the AI populated areas and
  // categorised CCE Bespoke vs bought-in correctly.
  const drawing_key_present =
    schedule.line_items.length === 0 ? false :
    schedule.line_items.some((l) => l.is_bespoke_fabrication) &&
    schedule.line_items.some((l) => l.is_bought_in_equipment);
  if (schedule.line_items.length > 5 && !drawing_key_present) {
    warnings.push("Drawing key not clearly identifiable — bespoke vs bought-in classification may be unreliable.");
  }

  // ---------- Line item completeness ----------
  let lineScoreSum = 0;
  let bespokeSpecScoreSum = 0;
  let bespokeCount = 0;
  const missingDimensionItems: string[] = [];
  const missingQuantityItems: string[] = [];

  for (const item of schedule.line_items) {
    let s = 0;
    let max = 0;

    // Required: description (mandatory)
    max += 30;
    if (item.description && item.description.length > 10) s += 30;

    // Required: quantity
    max += 20;
    if (item.quantity > 0) s += 20;
    else missingQuantityItems.push(item.item_no);

    // Required: manufacturer
    max += 15;
    if (item.manufacturer && item.manufacturer.length > 1) s += 15;

    // Required: product type mapped
    max += 15;
    if (item.inferred_product_type) s += 15;

    // Item number
    max += 10;
    if (item.item_no) s += 10;

    // AI's self-confidence
    max += 10;
    s += (item.confidence / 100) * 10;

    lineScoreSum += (s / max) * 100;

    // Bespoke fabrication items need dimensions to be priced
    if (item.is_bespoke_fabrication) {
      bespokeCount += 1;
      let bs = 0; let bmax = 0;
      const spec = item.suggested_spec;
      bmax += 40;
      if (spec?.length_mm && spec?.depth_mm) bs += 40;
      else missingDimensionItems.push(item.item_no);
      bmax += 20;
      if (spec?.material_grade && spec?.material_swg) bs += 20;
      bmax += 20;
      if (spec?.upstand_size_mm !== undefined) bs += 20;
      bmax += 20;
      if (spec?.under_structure) bs += 20;
      bespokeSpecScoreSum += (bs / bmax) * 100;
    }
  }

  const line_item_completeness = schedule.line_items.length === 0 ? 0 :
    Math.round(lineScoreSum / schedule.line_items.length);
  const bespoke_spec_completeness = bespokeCount === 0 ? 100 :
    Math.round(bespokeSpecScoreSum / bespokeCount);

  // ---------- Missing dimensions: warning only ----------
  // CCE schedules typically don't include L×D×H — those are measured off the
  // scaled floor plan. So we flag missing dims as a warning, not a blocker,
  // and let the estimator fill them in in the quote builder.
  if (missingDimensionItems.length > 0) {
    warnings.push(
      `${missingDimensionItems.length} of ${bespokeCount} bespoke items have no dimensions in the schedule — they'll be flagged in the quote builder for you to fill in (measure off the plan).`
    );
  }

  if (missingQuantityItems.length > 0) {
    warnings.push(
      `Quantities missing for items: ${missingQuantityItems.join(", ")}. Will default to 1 — please verify.`
    );
  }

  if (schedule.missing_required_info.length > 0) {
    warnings.push(...schedule.missing_required_info);
  }

  // ---------- Overall score ----------
  // Weighted: metadata 25%, line-item completeness 50%, bespoke specs 25%.
  // Bespoke specs (dimensions) weighted lower because they're commonly measured
  // off the scaled plan in CCE workflow rather than written into the schedule.
  const quality_score = Math.round(
    metadata_completeness * 0.25 +
    line_item_completeness * 0.5 +
    bespoke_spec_completeness * 0.25
  );

  const acceptable =
    schedule_table_present &&
    quality_score >= QUALITY_ACCEPT_THRESHOLD &&
    rejection_reasons.length === 0;

  if (!acceptable && rejection_reasons.length === 0) {
    rejection_reasons.push(`Overall quality score ${quality_score}% is below the ${QUALITY_ACCEPT_THRESHOLD}% threshold.`);
    advice.push(
      "Common fixes: add a drawing key, ensure the equipment schedule lists Item / Qty / Manufacturer / Description, " +
      "include dimensions for bespoke items, and verify all rows have quantities."
    );
  }

  return {
    quality_score,
    acceptable,
    components: {
      metadata_completeness,
      line_item_completeness,
      bespoke_spec_completeness,
      drawing_key_present,
      schedule_table_present,
    },
    rejection_reasons,
    warnings,
    advice,
  };
}
