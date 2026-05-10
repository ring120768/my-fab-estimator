// Read/write helpers for the costing matrix and estimates against Supabase.
// Pure data access — no React, no business logic.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyCostingData,
  CostingRules,
  LabourRate,
  MaterialRate,
  ProcessRate,
} from "@/pricing/types";
import { SEED_COMPANY } from "@/lib/seed-company";

// ---------------------------------------------------------------------------
// Membership lookup
// ---------------------------------------------------------------------------

export interface CompanyContext {
  company_id: string;
  company_name: string;
  role: "owner" | "estimator";
}

export async function getCurrentCompany(
  supabase: SupabaseClient
): Promise<CompanyContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_users")
    .select("role, company_id, companies(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  // companies is a related row; supabase-js types it as object | null
  const company = (data.companies as unknown as { name: string } | null);
  return {
    company_id: data.company_id,
    company_name: company?.name ?? "Untitled",
    role: data.role as "owner" | "estimator",
  };
}

// ---------------------------------------------------------------------------
// Load full CompanyCostingData for a given company_id
// ---------------------------------------------------------------------------

export async function loadCompanyData(
  supabase: SupabaseClient,
  company_id: string
): Promise<CompanyCostingData | null> {
  const [labour, material, process, rules] = await Promise.all([
    supabase
      .from("labour_rates")
      .select("rate_type, hourly_rate, minimum_hours")
      .eq("company_id", company_id),
    supabase
      .from("material_rates")
      .select("id, category, grade, size_label, thickness_mm, unit, unit_cost, supplier_name, stale_after_days")
      .eq("company_id", company_id),
    supabase
      .from("process_rates")
      .select("process_name, basis, time_minutes, minimum_minutes, labour_rate_type")
      .eq("company_id", company_id),
    supabase
      .from("costing_rules")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle(),
  ]);

  if (labour.error || material.error || process.error || rules.error) return null;
  if (!rules.data) return null;

  const r = rules.data;
  const costing_rules: CostingRules = {
    standard_waste_percentage: Number(r.standard_waste_percentage),
    consumables_percentage: Number(r.consumables_percentage),
    overhead_percentage: Number(r.overhead_percentage),
    pricing_method: r.pricing_method,
    default_margin_percentage: Number(r.default_margin_percentage),
    minimum_margin_percentage: Number(r.minimum_margin_percentage),
    minimum_order_value: Number(r.minimum_order_value),
    rounding_enabled: r.rounding_enabled,
    rounding_unit: Number(r.rounding_unit),
    // VAT lives on companies row in DB; pull it in from there.
    vat_registered: false,
    vat_rate: 20,
  };

  // Pull VAT settings from companies row
  const { data: companyRow } = await supabase
    .from("companies")
    .select("vat_registered, vat_rate")
    .eq("id", company_id)
    .maybeSingle();
  if (companyRow) {
    costing_rules.vat_registered = !!companyRow.vat_registered;
    costing_rules.vat_rate = Number(companyRow.vat_rate);
  }

  return {
    labour_rates: (labour.data ?? []).map((l) => ({
      rate_type: l.rate_type,
      hourly_rate: Number(l.hourly_rate),
    })) as LabourRate[],
    material_rates: (material.data ?? []).map((m) => ({
      category: m.category,
      grade: m.grade ?? undefined,
      size_label: m.size_label ?? undefined,
      thickness_mm: m.thickness_mm == null ? undefined : Number(m.thickness_mm),
      unit: m.unit,
      unit_cost: Number(m.unit_cost),
    })) as MaterialRate[],
    process_rates: (process.data ?? []).map((p) => ({
      process_name: p.process_name,
      basis: p.basis,
      time_minutes: Number(p.time_minutes),
      minimum_minutes: p.minimum_minutes == null ? undefined : Number(p.minimum_minutes),
      labour_rate_type: p.labour_rate_type,
    })) as ProcessRate[],
    costing_rules,
  };
}

// ---------------------------------------------------------------------------
// Save CompanyCostingData back. Strategy: upsert per stable key, replace
// material_rates wholesale (no natural key). Owner-only via RLS.
// ---------------------------------------------------------------------------

export async function saveCompanyData(
  supabase: SupabaseClient,
  company_id: string,
  data: CompanyCostingData
): Promise<{ error: string | null }> {
  // Labour rates — unique (company_id, rate_type).
  for (const r of data.labour_rates) {
    const { error } = await supabase.from("labour_rates").upsert(
      { company_id, rate_type: r.rate_type, hourly_rate: r.hourly_rate },
      { onConflict: "company_id,rate_type" }
    );
    if (error) return { error: `labour_rates: ${error.message}` };
  }

  // Process rates — unique (company_id, process_name).
  for (const p of data.process_rates) {
    const { error } = await supabase.from("process_rates").upsert(
      {
        company_id,
        process_name: p.process_name,
        basis: p.basis,
        time_minutes: p.time_minutes,
        minimum_minutes: p.minimum_minutes ?? 0,
        labour_rate_type: p.labour_rate_type,
      },
      { onConflict: "company_id,process_name" }
    );
    if (error) return { error: `process_rates: ${error.message}` };
  }

  // Material rates — clear and reinsert (no stable user-facing key).
  const del = await supabase.from("material_rates").delete().eq("company_id", company_id);
  if (del.error) return { error: `material_rates delete: ${del.error.message}` };
  if (data.material_rates.length > 0) {
    const ins = await supabase.from("material_rates").insert(
      data.material_rates.map((m) => ({
        company_id,
        category: m.category,
        grade: m.grade ?? null,
        size_label: m.size_label ?? null,
        thickness_mm: m.thickness_mm ?? null,
        unit: m.unit,
        unit_cost: m.unit_cost,
      }))
    );
    if (ins.error) return { error: `material_rates insert: ${ins.error.message}` };
  }

  // Costing rules — one row per company.
  const r = data.costing_rules;
  const rulesUpsert = await supabase.from("costing_rules").upsert(
    {
      company_id,
      standard_waste_percentage: r.standard_waste_percentage,
      consumables_percentage: r.consumables_percentage,
      overhead_percentage: r.overhead_percentage,
      pricing_method: r.pricing_method,
      default_margin_percentage: r.default_margin_percentage,
      minimum_margin_percentage: r.minimum_margin_percentage,
      minimum_order_value: r.minimum_order_value,
      rounding_enabled: r.rounding_enabled,
      rounding_unit: r.rounding_unit,
    },
    { onConflict: "company_id" }
  );
  if (rulesUpsert.error) return { error: `costing_rules: ${rulesUpsert.error.message}` };

  // VAT lives on companies row.
  const compUpdate = await supabase
    .from("companies")
    .update({ vat_registered: r.vat_registered, vat_rate: r.vat_rate })
    .eq("id", company_id);
  if (compUpdate.error) return { error: `companies VAT: ${compUpdate.error.message}` };

  return { error: null };
}

// ---------------------------------------------------------------------------
// Create a company + bootstrap owner row + seed default rates.
// ---------------------------------------------------------------------------

export async function createCompanyForUser(
  supabase: SupabaseClient,
  company_name: string
): Promise<{ company_id?: string; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // 1. Bootstrap company + owner row atomically (SECURITY DEFINER function).
  //    This avoids the chicken-and-egg RLS problem on the companies SELECT.
  const { data: companyId, error: rpcErr } = await supabase.rpc(
    "create_company_with_owner",
    { p_name: company_name }
  );
  if (rpcErr || !companyId) {
    return { error: rpcErr?.message ?? "Failed to create company." };
  }

  // 2. Set VAT defaults on the new company row (now allowed via RLS).
  const { error: vErr } = await supabase
    .from("companies")
    .update({ vat_registered: true, vat_rate: 20 })
    .eq("id", companyId);
  if (vErr) return { error: `companies VAT defaults: ${vErr.message}` };

  // 3. Seed default rates.
  const seedErr = await saveCompanyData(supabase, companyId as string, SEED_COMPANY);
  if (seedErr.error) return { error: `seeding: ${seedErr.error}` };

  return { company_id: companyId as string, error: null };
}
