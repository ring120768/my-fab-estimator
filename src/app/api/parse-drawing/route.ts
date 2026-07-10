// Server route: POST /api/parse-drawing
// Accepts a PDF or DXF, routes to the right extraction tier, returns a
// DrawingParseResult with quality score. File bytes are NOT persisted.
//
// Tier status:
//   Tier 1 (annotations, PDF)  — WIRED. Reuses the schedule parser's provider
//                                layer (it's format-agnostic: PDF in, JSON out).
//   Tier 2 (dxf_geometry)      — STUB. Implement in src/lib/drawing/dxf.ts
//                                using the `dxf-parser` npm package. Contract:
//                                parseDxf(bytes): ParsedDrawing.
//   Tier 3 (scale_measure)     — STUB. Client-side calibration UI sends two
//                                points + a known length; server measures the
//                                remaining vector geometry. Later phase.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickProvider } from "@/lib/ai/providers";
import { routeDrawingFile } from "@/lib/drawing/router";
import { DRAWING_DIMENSION_PROMPT } from "@/lib/drawing/prompt";
import { assessDrawingQuality } from "@/lib/drawing/quality";
import type { ParsedDrawing, DrawingParseResult } from "@/lib/drawing/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function failureResponse(
  reason: string,
  advice: string[] = [],
  status = 502,
  raw?: string
): NextResponse {
  return NextResponse.json({
    ok: false,
    drawing: null,
    assessment: {
      quality_score: 0,
      acceptable: false,
      components: {
        items_found: 0,
        items_fully_dimensioned: 0,
        dimension_completeness: 0,
        scale_declared: false,
        method_reliability: 0,
      },
      rejection_reasons: [reason],
      warnings: [],
      advice,
    },
    raw_error: raw,
  } satisfies DrawingParseResult, { status });
}

export async function POST(request: Request) {
  // Auth gate — same pattern as parse-schedule
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read the upload
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return failureResponse("No file uploaded.", ["Attach a PDF or DXF drawing."], 400);
  }
  const bytes = await file.arrayBuffer();
  const filename = file.name || "drawing.pdf";

  // Route to a tier
  const route = routeDrawingFile(filename, bytes);

  if (route.tier === 0) {
    return failureResponse(route.reason, [route.advice], 400);
  }

  if (route.tier === 2) {
    // TODO(tier 2): const drawing = parseDxf(bytes) from src/lib/drawing/dxf.ts
    return failureResponse(
      "DXF parsing is not implemented yet.",
      ["Upload the PDF version of this drawing for now — DXF support is coming."],
      501
    );
  }

  // ---------- Tier 1: AI vision on annotated PDF ----------
  const provider = pickProvider();
  if (!provider) {
    return NextResponse.json({
      error: "AI parser not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
    }, { status: 503 });
  }

  let rawText: string;
  try {
    rawText = await provider.parse_document(bytes, filename, DRAWING_DIMENSION_PROMPT);
  } catch (err) {
    return failureResponse(
      "AI provider call failed.",
      ["Try again in a minute. If it persists, check API key configuration."],
      502,
      err instanceof Error ? err.message : String(err)
    );
  }

  // Parse + normalise — never trust the model to return perfect JSON
  let parsed: ParsedDrawing;
  try {
    const text = rawText.trim().startsWith("{") ? rawText : `{${rawText}`;
    parsed = JSON.parse(text);
  } catch {
    return failureResponse(
      "AI returned unparseable output.",
      ["Re-upload the drawing. If it's a photo or scan, dimension text may be illegible."],
      502,
      rawText.slice(0, 500)
    );
  }

  parsed.drawing_metadata = parsed.drawing_metadata ?? { units: "unknown" };
  parsed.primary_method = "annotations";
  parsed.items = Array.isArray(parsed.items) ? parsed.items : [];
  parsed.general_warnings = Array.isArray(parsed.general_warnings) ? parsed.general_warnings : [];
  parsed.missing_required_info = Array.isArray(parsed.missing_required_info) ? parsed.missing_required_info : [];
  parsed.raw_confidence = typeof parsed.raw_confidence === "number" ? parsed.raw_confidence : 0;

  // Quality assessment (extractor-agnostic — tiers 2 and 3 reuse this as-is)
  const assessment = assessDrawingQuality(parsed);

  // TODO(tier 3): when assessment.acceptable is false AND the PDF contains
  // vector geometry, respond with a flag inviting the client to start the
  // calibrate-and-measure flow instead of a hard rejection.

  const result: DrawingParseResult = {
    ok: assessment.acceptable,
    drawing: parsed,
    assessment,
  };

  return NextResponse.json(result, { status: 200 });
}
