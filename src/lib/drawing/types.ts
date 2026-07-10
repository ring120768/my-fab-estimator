// Types for the drawing dimension parser (Phase: drawing interpretation).
//
// One upload flow, three extraction tiers, ONE output shape. Every tier —
// AI vision on annotated PDFs (tier 1), DXF geometry (tier 2), scale
// calibration (tier 3) — produces a ParsedDrawing. Downstream code (quality
// gate, estimate mapper, UI) never needs to know which tier ran.

// ---------- Extraction method ----------

export type ExtractionMethod =
  | "annotations"   // tier 1: AI vision read printed dimension text
  | "dxf_geometry"  // tier 2: exact coordinates parsed from DXF entities
  | "scale_measure" // tier 3: measured from vector geometry after calibration
  | "manual";       // user typed it in after a failed/partial parse

// ---------- Per-item extracted dimensions ----------

// Deliberately mirrors ParsedLineItem.suggested_spec (src/lib/ai/types.ts)
// so a DimensionedItem maps 1:1 onto an estimate input.
export interface DimensionedItem {
  item_no?: string;              // if the drawing labels items (e.g. "5.01")
  label: string;                 // best name found: "SINK UNIT", "WALL BENCH 3"
  quantity: number;              // default 1 if not stated

  length_mm?: number;
  depth_mm?: number;
  height_mm?: number;

  // Secondary dims when present on fab drawings
  upstand_size_mm?: number;
  bowl_positions_mm?: number[];  // sink bowl centres from left end
  extra_dimensions?: {           // anything else annotated, keep it raw
    name: string;                // e.g. "shelf height", "void width"
    value_mm: number;
  }[];

  // Where each primary dim came from — a single item can mix sources
  // (e.g. length read from annotation, height measured from scale)
  dimension_sources: Partial<
    Record<"length_mm" | "depth_mm" | "height_mm", ExtractionMethod>
  >;

  confidence: number;            // 0-100 for THIS item's dimensions
  missing_fields: string[];      // e.g. "height not annotated"
}

// ---------- Whole-drawing result ----------

export interface ParsedDrawing {
  // Reuses the metadata shape from the schedule parser
  drawing_metadata: {
    project_name?: string;
    drawing_number?: string;
    revision?: string;
    scale?: string;              // as printed, e.g. "1:20 @ A3"
    paper_size?: string;         // e.g. "A3" — needed for tier 3 sanity checks
    units?: "mm" | "cm" | "m" | "in" | "unknown";
  };

  primary_method: ExtractionMethod; // the tier that produced most dims
  items: DimensionedItem[];

  general_warnings: string[];       // e.g. "Drawing appears rescaled from A1"
  missing_required_info: string[];  // e.g. "No height dimensions anywhere"
  raw_confidence: number;           // 0-100, extractor's self-assessment
}

// ---------- After server-side quality scoring ----------

export interface DrawingQualityAssessment {
  quality_score: number;         // 0-100, OUR computed score
  acceptable: boolean;

  components: {
    items_found: number;
    items_fully_dimensioned: number;    // has L + D (+ H where relevant)
    dimension_completeness: number;     // 0-100
    scale_declared: boolean;            // title block scale detected
    method_reliability: number;         // 0-100, dxf > annotations > scale
  };

  rejection_reasons: string[];
  warnings: string[];
  advice: string[];
}

export interface DrawingParseResult {
  ok: boolean;
  drawing: ParsedDrawing | null;
  assessment: DrawingQualityAssessment;
  raw_error?: string;
}

// Tunable, same idea as QUALITY_ACCEPT_THRESHOLD for schedules.
// Drawings are lower-stakes than schedules (user reviews dims before pricing)
// so we accept lower and lean on per-item confidence flags in the UI.
export const DRAWING_QUALITY_ACCEPT_THRESHOLD = 50;

// Reliability weights by method — used by quality scoring. DXF geometry is
// exact; annotations depend on legibility; scale measurement depends on
// calibration quality; manual is user-verified so it's trusted.
export const METHOD_RELIABILITY: Record<ExtractionMethod, number> = {
  dxf_geometry: 100,
  manual: 100,
  annotations: 80,
  scale_measure: 60,
};

// ---------- Sanity limits (catch unit errors + wild misreads) ----------
// A "2000" read as metres, or a calibration off by 10x, gets caught here.
export const DIMENSION_LIMITS_MM = {
  length: { min: 100, max: 12000 },
  depth: { min: 100, max: 3000 },
  height: { min: 50, max: 3000 },
} as const;
