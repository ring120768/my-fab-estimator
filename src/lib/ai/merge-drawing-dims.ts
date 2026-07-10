// Merge dimensions from a ParsedDrawing (dimension parser) into a
// ParsedSchedule (schedule table parser) so downstream code sees a single
// enriched schedule with dims filled in.
//
// Merge rules — schedule wins:
//   1. If the AI already extracted dims into suggested_spec (from readable
//      schedule text), keep them. Schedule text is usually the authoritative
//      version when present.
//   2. Otherwise, if the drawing parser found matching dims (by item_no),
//      copy them into suggested_spec and tag dimension_source so the UI can
//      show provenance.
//   3. If neither has dims, the item stays undimensioned — the UI already
//      flags this ("⚠ no dimensions").
//
// Matching strategy — item_no is the canonical join key. Both parsers read
// the same drawing so both should extract the same "5.01" / "1.43" labels.
// Falls back to case-insensitive label match on `label` vs `description` for
// items that lack a schedule item_no.

import type { ParsedSchedule, ParsedLineItem } from "./types";
import type { ParsedDrawing, DimensionedItem, ExtractionMethod } from "@/lib/drawing/types";

export type DimensionSource = "schedule" | "drawing" | "estimated";

/**
 * Enrich a schedule with dimensions from the drawing parser.
 * Returns a new ParsedSchedule (does not mutate input).
 */
export function mergeDrawingDimensions(
  schedule: ParsedSchedule,
  drawing: ParsedDrawing
): ParsedSchedule {
  if (drawing.items.length === 0) return schedule;

  // Index drawing items by item_no first (canonical), fall back to label.
  const byItemNo = new Map<string, DimensionedItem>();
  const byLabel = new Map<string, DimensionedItem>();
  for (const d of drawing.items) {
    if (d.item_no) byItemNo.set(d.item_no.trim(), d);
    if (d.label) byLabel.set(d.label.trim().toLowerCase(), d);
  }

  return {
    ...schedule,
    line_items: schedule.line_items.map((item) => enrichOne(item, byItemNo, byLabel, drawing.primary_method)),
  };
}

function enrichOne(
  item: ParsedLineItem,
  byItemNo: Map<string, DimensionedItem>,
  byLabel: Map<string, DimensionedItem>,
  method: ExtractionMethod
): ParsedLineItem {
  // Bespoke fabrication only — bought-in equipment gets its size from the
  // supplier data, and BY CLIENT / FUTURE items don't need dims.
  if (!item.is_bespoke_fabrication) return item;

  // Match strategy:
  //   1. If the schedule item has an item_no, join on that. If it doesn't
  //      match, leave the item untouched — don't fall through to label match.
  //      (Generic labels like "wall bench" would over-match; better to leave
  //      dims blank than attach the wrong ones from a different item.)
  //   2. If the schedule item has NO item_no, use the description as a label
  //      match against the drawing.
  let match: DimensionedItem | undefined;
  const itemNoKey = item.item_no?.trim();
  if (itemNoKey) {
    match = byItemNo.get(itemNoKey);
  } else if (item.description) {
    match = byLabel.get(item.description.trim().toLowerCase());
  }
  if (!match) return item;

  // If schedule already filled a dim, keep it. Otherwise copy from drawing.
  const spec = item.suggested_spec ?? {};
  const scheduleHadDims = Boolean(spec.length_mm || spec.depth_mm || spec.height_mm);

  const merged: NonNullable<ParsedLineItem["suggested_spec"]> = {
    ...spec,
    length_mm: spec.length_mm ?? match.length_mm,
    depth_mm: spec.depth_mm ?? match.depth_mm,
    height_mm: spec.height_mm ?? match.height_mm,
    upstand_size_mm: spec.upstand_size_mm ?? match.upstand_size_mm,
  };

  // Provenance tag — schedule / drawing / mixed. Populated at line level so
  // the UI can badge it. Kept in missing_fields for now (a proper field
  // requires a schema bump — worth it in a follow-up, but not blocking here).
  const provenance = scheduleHadDims
    ? "dimension_source: mixed (schedule + drawing)"
    : `dimension_source: drawing (${method})`;
  const missing = item.missing_fields.filter((m) => !m.startsWith("dimension_source:"));
  missing.push(provenance);

  return {
    ...item,
    suggested_spec: merged,
    missing_fields: missing,
  };
}
