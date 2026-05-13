// Server route: GET /api/check-readiness
// Used by the import page (and dashboard) to verify that everything the AI
// parser + pricing engine need is actually in place before the user uploads.
//
// Returns a structured readiness report — never throws, always gives advice.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { describeProvider } from "@/lib/ai/providers";

export const runtime = "nodejs";

export interface ReadinessCheck {
  ok: boolean;
  label: string;
  detail: string;
  fix_link?: string;     // path to send the user to fix it
  fix_label?: string;
}

export interface ReadinessReport {
  overall_ok: boolean;
  checks: ReadinessCheck[];
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: ReadinessCheck[] = [];

  // 1. AI provider configured (OpenAI or Anthropic)
  const ai = describeProvider();
  checks.push({
    ok: ai.configured,
    label: "AI provider configured",
    detail: ai.configured
      ? `${ai.selected} (${ai.model}) is set.${ai.fallback_available ? " Both providers available — failover possible." : ""}`
      : "Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set. The drawing import won't work until at least one is configured.",
  });

  // 2. Find user's company
  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!cu) {
    checks.push({
      ok: false,
      label: "Company set up",
      detail: "You haven't completed company onboarding yet.",
      fix_link: "/onboarding/company",
      fix_label: "Set up company",
    });
    return NextResponse.json({
      overall_ok: false,
      checks,
    } satisfies ReadinessReport);
  }
  const company_id = cu.company_id;

  checks.push({
    ok: true,
    label: "Company set up",
    detail: "Your company profile is in place.",
  });

  // 3. Labour rates
  const { count: labourCount } = await supabase
    .from("labour_rates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id);
  const labourOk = (labourCount ?? 0) >= 2;
  checks.push({
    ok: labourOk,
    label: "Labour rates configured",
    detail: labourOk
      ? `${labourCount} labour rate${labourCount === 1 ? "" : "s"} on file.`
      : "Need at least fabrication and polishing rates to price bespoke items.",
    fix_link: labourOk ? undefined : "/costing-matrix",
    fix_label: labourOk ? undefined : "Open costing matrix",
  });

  // 4. Material rates (need at least one sheet)
  const { count: materialCount } = await supabase
    .from("material_rates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id);
  const { count: sheetCount } = await supabase
    .from("material_rates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id)
    .eq("category", "sheet");
  const materialOk = (sheetCount ?? 0) >= 1;
  checks.push({
    ok: materialOk,
    label: "Sheet rates configured",
    detail: materialOk
      ? `${materialCount} material rates on file (${sheetCount} sheet variants).`
      : "Need at least one stainless steel sheet rate to price bespoke fabrication.",
    fix_link: materialOk ? undefined : "/costing-matrix",
    fix_label: materialOk ? undefined : "Open costing matrix",
  });

  // 5. Costing rules
  const { data: rules } = await supabase
    .from("costing_rules")
    .select("default_margin_percentage, vat_rate")
    .eq("company_id", company_id)
    .maybeSingle();
  const rulesOk = Boolean(rules && rules.default_margin_percentage > 0);
  checks.push({
    ok: rulesOk,
    label: "Costing rules set",
    detail: rulesOk
      ? `Default margin ${rules!.default_margin_percentage}%, VAT ${rules!.vat_rate}%.`
      : "Default margin not set — engine can't compute sell prices.",
    fix_link: rulesOk ? undefined : "/costing-matrix#default-margin",
    fix_label: rulesOk ? undefined : "Set default margin →",
  });

  // 6. Feature & sub-component library
  const { count: featureCount } = await supabase
    .from("feature_library")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id);
  const { count: subCount } = await supabase
    .from("subcomponent_library")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company_id);
  const libraryOk = (featureCount ?? 0) >= 10 && (subCount ?? 0) >= 10;
  checks.push({
    ok: libraryOk,
    label: "Feature & sub-component library",
    detail: libraryOk
      ? `${featureCount} features + ${subCount} sub-components.`
      : `Only ${featureCount ?? 0} features and ${subCount ?? 0} sub-components on file — the AI parser maps to these so the library needs to be populated.`,
    fix_link: libraryOk ? undefined : "/costing-matrix",
    fix_label: libraryOk ? undefined : "Seed the library",
  });

  const overall_ok = checks.every((c) => c.ok);

  return NextResponse.json({
    overall_ok,
    checks,
  } satisfies ReadinessReport);
}
