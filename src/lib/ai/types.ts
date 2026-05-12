// Types for the AI schedule parser.
// Strict JSON schema returned from the AI provider. Server-side route validates
// the response against this shape; anything off-schema is rejected.

import type { ProductType } from "@/pricing/v2/types";

// ---------- AI response ----------

export interface ParsedDrawingMetadata {
  project_name?: string;
  client_name?: string;
  site_address?: string;
  area?: string;
  drawing_number?: string;
  revision?: string;
  drawing_date?: string;       // ISO if extractable
  scale?: string;              // e.g. "1:50"
  drawn_by?: string;
}

export interface ParsedLineItem {
  item_no: string;             // e.g. "5.01"
  area_label?: string;         // e.g. "AREA 5 — COOK AND PACK"
  quantity: number;
  manufacturer: string;        // "CCE BESPOKE" | "BLUE SEAL" | ... | "BY CLIENT" | "FUTURE ITEM"
  model?: string;
  description: string;

  // What we mapped this to in our product taxonomy
  inferred_product_type: ProductType;
  is_bespoke_fabrication: boolean;
  is_bought_in_equipment: boolean;
  is_client_supplied: boolean;
  is_future_item: boolean;

  // Optional structured spec fields the AI could extract
  suggested_spec?: {
    length_mm?: number;
    depth_mm?: number;
    height_mm?: number;
    upstand_size_mm?: number;
    upstand_position?: "rear" | "rear_and_ends" | "rear_and_both_ends";
    under_structure?:
      | "open_no_panels"
      | "open_with_base_shelf"
      | "open_with_void"
      | "open_with_mid_shelf"
      | "cupboard_hinged"
      | "cupboard_sliding"
      | "drawer_bank"
      | "lined_lockable"
      | "mixed";
    material_grade?: "304" | "316" | "430";
    material_swg?: 18 | 16 | 14 | 10;
    material_finish?: "brushed" | "burnished" | "mirror";
    feature_codes?: string[];    // catalogue codes we have in the feature library
  };

  // For bought-in equipment, an estimated supplier list price (if AI knows or sees one)
  suggested_supplier_list_price?: number;

  // Per-item confidence + missing fields
  confidence: number;            // 0-100
  missing_fields: string[];      // human-readable list of what's not in the source
}

export interface ParsedSchedule {
  // Top-level metadata
  drawing_metadata: ParsedDrawingMetadata;

  // Per-area grouping
  areas: string[];               // unique list of area labels found

  // Extracted line items in document order
  line_items: ParsedLineItem[];

  // Source-level concerns
  general_warnings: string[];    // e.g. "No drawing key found"
  missing_required_info: string[]; // e.g. "Quantities not specified for 4 items"

  // How sure was the AI about the overall extraction
  raw_confidence: number;        // 0-100, AI's self-assessment
}

// ---------- After server-side quality scoring ----------

export interface QualityAssessment {
  quality_score: number;         // 0-100, our computed score (not AI's self-assessment)
  acceptable: boolean;           // true if score >= threshold and no critical blockers

  // Granular breakdown
  components: {
    metadata_completeness: number;     // 0-100
    line_item_completeness: number;    // 0-100
    bespoke_spec_completeness: number; // 0-100
    drawing_key_present: boolean;
    schedule_table_present: boolean;
  };

  rejection_reasons: string[];       // populated if acceptable=false
  warnings: string[];                // soft issues (proceed but flag)
  advice: string[];                  // what the user should fix and re-upload
}

export interface ParseResult {
  ok: boolean;                       // true if quality acceptable
  schedule: ParsedSchedule | null;   // null if AI couldn't parse at all
  assessment: QualityAssessment;
  raw_error?: string;                // populated if API call failed
}

// Threshold below which we reject — tunable per company later
export const QUALITY_ACCEPT_THRESHOLD = 60;
