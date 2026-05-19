// Server route: POST /api/parse-schedule
// Accepts a PDF, dispatches to the configured AI provider, returns ParseResult
// with quality score. PDF bytes are NOT persisted server-side.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_PARSER_PROMPT } from "@/lib/ai/prompt";
import { assessQuality } from "@/lib/ai/quality";
import { pickProvider } from "@/lib/ai/providers";
import { enrichWithCatalogueMatches } from "@/lib/ai/catalogue-match";
import type { ParsedSchedule, ParseResult } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function failureResponse(reason: string, advice: string[] = [], status = 502, raw?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    schedule: null,
    assessment: {
      quality_score: 0,
      acceptable: false,
      components: { metadata_completeness: 0, line_item_completeness: 0, bespoke_spec_completeness: 0, drawing_key_present: false, schedule_table_present: false },
      rejection_reasons: [reason],
      warnings: [],
      advice,
    },
    raw_error: raw,
  } satisfies ParseResult, { status });
}

export async function POST(request: Request) {
  // Auth gate
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pick provider
  const provider = pickProvider();
  if (!provider) {
    return NextResponse.json({
      error: "AI parser not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.",
    }, { status: 503 });
  }

  // Read the uploaded PDF
  let fileBytes: ArrayBuffer;
  let filename = "drawing.pdf";
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' field." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)." }, { status: 413 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported in this MVP." }, { status: 415 });
    }
    filename = file.name;
    fileBytes = await file.arrayBuffer();
  } catch (e) {
    return NextResponse.json({ error: "Could not read uploaded file." }, { status: 400 });
  }

  // Call the AI provider
  let aiContent: string;
  try {
    aiContent = await provider.parse_schedule(fileBytes, filename, SCHEDULE_PARSER_PROMPT);
  } catch (e) {
    return failureResponse(
      `AI provider (${provider.name}) failed.`,
      ["Try a smaller PDF, retry, or switch provider via the AI_PROVIDER env var."],
      502,
      e instanceof Error ? e.message : String(e),
    );
  }

  // Parse and validate
  let parsed: ParsedSchedule;
  try {
    parsed = JSON.parse(aiContent);
  } catch (e) {
    return failureResponse(
      "AI returned malformed JSON.",
      ["Re-upload — a retry often succeeds with the same file."],
      502,
      e instanceof Error ? e.message : String(e),
    );
  }

  // Defensive defaults for missing fields
  parsed.drawing_metadata = parsed.drawing_metadata ?? {};
  parsed.areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  parsed.line_items = Array.isArray(parsed.line_items) ? parsed.line_items : [];
  parsed.general_warnings = Array.isArray(parsed.general_warnings) ? parsed.general_warnings : [];
  parsed.missing_required_info = Array.isArray(parsed.missing_required_info) ? parsed.missing_required_info : [];
  parsed.raw_confidence = typeof parsed.raw_confidence === "number" ? parsed.raw_confidence : 0;

  // Enrich bought-in lines with catalogue matches before quality scoring,
  // so the score (and the client) reflect what we can auto-price. Failures
  // here are non-fatal — fall back to the unenriched schedule.
  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  const enriched = cu?.company_id
    ? await enrichWithCatalogueMatches(supabase, cu.company_id, parsed).catch(() => parsed)
    : parsed;

  // Quality assessment (provider-agnostic)
  const assessment = assessQuality(enriched);
  const result: ParseResult = {
    ok: assessment.acceptable,
    schedule: enriched,
    assessment,
  };

  return NextResponse.json(result, { status: 200 });
}
