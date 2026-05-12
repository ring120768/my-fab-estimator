// Server route: POST /api/parse-schedule
// Accepts a PDF (multipart/form-data, field "file"), calls OpenAI GPT-4o
// with the schedule-parser prompt, returns ParseResult with quality score.
//
// PDF bytes are NOT persisted server-side.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_PARSER_PROMPT } from "@/lib/ai/prompt";
import { assessQuality } from "@/lib/ai/quality";
import type { ParsedSchedule, ParseResult } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

export async function POST(request: Request) {
  // ---------- Auth gate ----------
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---------- Config check ----------
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "AI parser not configured. Add OPENAI_API_KEY to environment variables.",
    }, { status: 503 });
  }

  // ---------- Read the uploaded PDF ----------
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

  // ---------- Call OpenAI ----------
  // GPT-4o accepts PDFs as base64-encoded data URLs in image messages.
  const base64 = Buffer.from(fileBytes).toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEDULE_PARSER_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Drawing file: ${filename}. Extract the equipment schedule following the system prompt's rules. Return strict JSON only.`,
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      schedule: null,
      assessment: { quality_score: 0, acceptable: false, components: { metadata_completeness: 0, line_item_completeness: 0, bespoke_spec_completeness: 0, drawing_key_present: false, schedule_table_present: false }, rejection_reasons: ["Failed to reach AI provider."], warnings: [], advice: ["Check your internet connection and try again."] },
      raw_error: e instanceof Error ? e.message : String(e),
    } satisfies ParseResult, { status: 502 });
  }

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    return NextResponse.json({
      ok: false,
      schedule: null,
      assessment: { quality_score: 0, acceptable: false, components: { metadata_completeness: 0, line_item_completeness: 0, bespoke_spec_completeness: 0, drawing_key_present: false, schedule_table_present: false }, rejection_reasons: [`AI provider returned ${openaiResponse.status}.`], warnings: [], advice: ["Try a smaller file or different drawing format."] },
      raw_error: errText.slice(0, 500),
    } satisfies ParseResult, { status: 502 });
  }

  const openaiJson = await openaiResponse.json();
  const content = openaiJson?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return NextResponse.json({
      ok: false,
      schedule: null,
      assessment: { quality_score: 0, acceptable: false, components: { metadata_completeness: 0, line_item_completeness: 0, bespoke_spec_completeness: 0, drawing_key_present: false, schedule_table_present: false }, rejection_reasons: ["AI returned empty response."], warnings: [], advice: ["Re-upload and try again."] },
    } satisfies ParseResult, { status: 502 });
  }

  // ---------- Parse + validate ----------
  let parsed: ParsedSchedule;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      schedule: null,
      assessment: { quality_score: 0, acceptable: false, components: { metadata_completeness: 0, line_item_completeness: 0, bespoke_spec_completeness: 0, drawing_key_present: false, schedule_table_present: false }, rejection_reasons: ["AI returned malformed JSON."], warnings: [], advice: ["Re-upload — sometimes a retry succeeds with the same file."] },
      raw_error: e instanceof Error ? e.message : String(e),
    } satisfies ParseResult, { status: 502 });
  }

  // Minimal shape guard — fill in safe defaults for missing fields
  parsed.drawing_metadata = parsed.drawing_metadata ?? {};
  parsed.areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  parsed.line_items = Array.isArray(parsed.line_items) ? parsed.line_items : [];
  parsed.general_warnings = Array.isArray(parsed.general_warnings) ? parsed.general_warnings : [];
  parsed.missing_required_info = Array.isArray(parsed.missing_required_info) ? parsed.missing_required_info : [];
  parsed.raw_confidence = typeof parsed.raw_confidence === "number" ? parsed.raw_confidence : 0;

  // ---------- Quality assessment ----------
  const assessment = assessQuality(parsed);
  const result: ParseResult = {
    ok: assessment.acceptable,
    schedule: parsed,
    assessment,
  };

  return NextResponse.json(result, { status: 200 });
}
