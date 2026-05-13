// Data access for the multi-line quote system. Reads the feature/subcomponent
// libraries and persists quote headers + line items.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnyProductSpec,
  FeatureChoice,
  FeatureLibraryEntry,
  LineItemBreakdown,
  ProductType,
  QuoteEngineLibrary,
  SubcomponentChoice,
  SubcomponentLibraryEntry,
} from "@/pricing/v2/types";

// ---------------------------------------------------------------------------
// Library (per company)
// ---------------------------------------------------------------------------

export async function loadLibrary(
  supabase: SupabaseClient,
  company_id: string
): Promise<QuoteEngineLibrary> {
  const [feat, sub] = await Promise.all([
    supabase
      .from("feature_library")
      .select("code, name, applies_to, material_cost, labour_minutes, labour_rate_type, default_price, unit_basis")
      .eq("company_id", company_id)
      .eq("active", true),
    supabase
      .from("subcomponent_library")
      .select("code, name, applies_to, size_label, material_cost, labour_minutes, labour_rate_type, default_price")
      .eq("company_id", company_id)
      .eq("active", true),
  ]);

  const features: FeatureLibraryEntry[] = (feat.data ?? []).map((f) => ({
    code: f.code,
    name: f.name,
    applies_to: f.applies_to as ProductType[],
    material_cost: Number(f.material_cost),
    labour_minutes: Number(f.labour_minutes),
    labour_rate_type: f.labour_rate_type,
    default_price: f.default_price == null ? undefined : Number(f.default_price),
    unit_basis: f.unit_basis,
  }));

  const subcomponents: SubcomponentLibraryEntry[] = (sub.data ?? []).map((s) => ({
    code: s.code,
    name: s.name,
    applies_to: s.applies_to as ProductType[],
    size_label: s.size_label ?? undefined,
    material_cost: Number(s.material_cost),
    labour_minutes: Number(s.labour_minutes),
    labour_rate_type: s.labour_rate_type,
    default_price: s.default_price == null ? undefined : Number(s.default_price),
  }));

  return { features, subcomponents };
}

// ---------------------------------------------------------------------------
// Quote header + line items
// ---------------------------------------------------------------------------

export interface QuoteHeaderInput {
  quote_reference: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  project_name?: string;
  project_location?: string;
  prepared_by?: string;
  internal_notes?: string;
  prices_held_until?: string;       // ISO date
  payment_terms?: string;
}

export interface QuoteLineInput {
  position: number;
  // Schedule item number from the drawing (e.g. "5.01"). Preserved verbatim.
  // Optional — if missing, we generate "1.NNN" from the position as a fallback.
  item_no?: string;
  product_type: ProductType;
  description: string;
  quantity: number;
  spec: AnyProductSpec;
  features: FeatureChoice[];
  subcomponents: SubcomponentChoice[];
  labour_hours_override?: number;
  unit_price_override?: number;
  calculated_breakdown: LineItemBreakdown;
  unit_price_ex_vat: number;
  line_total_ex_vat: number;
  item_reference?: string;
  model_no?: string;
}

export interface SaveQuoteResult {
  quote_id?: string;
  error: string | null;
}

export async function saveQuote(
  supabase: SupabaseClient,
  company_id: string,
  header: QuoteHeaderInput,
  lines: QuoteLineInput[],
  totals: { subtotal_ex_vat: number; vat_rate: number; vat_amount: number; total_inc_vat: number },
  costing_snapshot: unknown
): Promise<SaveQuoteResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // 1. Insert quote header
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .insert({
      company_id,
      created_by: user.id,
      quote_reference: header.quote_reference,
      customer_name: header.customer_name ?? null,
      customer_company: header.customer_company ?? null,
      customer_email: header.customer_email ?? null,
      project_name: header.project_name ?? null,
      project_location: header.project_location ?? null,
      prepared_by: header.prepared_by ?? null,
      internal_notes: header.internal_notes ?? null,
      prices_held_until: header.prices_held_until ?? null,
      payment_terms: header.payment_terms ?? null,
      subtotal_ex_vat: totals.subtotal_ex_vat,
      vat_rate: totals.vat_rate,
      vat_amount: totals.vat_amount,
      total_inc_vat: totals.total_inc_vat,
      costing_snapshot,
    })
    .select("id")
    .single();
  if (qErr || !quote) return { error: qErr?.message ?? "Failed to create quote." };

  // 2. Insert line items
  if (lines.length > 0) {
    const rows = lines.map((l) => ({
      quote_id: quote.id,
      position: l.position,
      // Preserve the drawing schedule's item number if supplied; otherwise
      // fall back to a generated 1.NNN based on position. Schedule loyalty:
      // cross-references inside descriptions (e.g. "filter for ITEM 5.09")
      // stay intact when the source numbering is preserved.
      item_no: l.item_no?.trim() || `1.${String(l.position).padStart(3, "0")}`,
      product_type: l.product_type,
      item_reference: l.item_reference ?? null,
      model_no: l.model_no ?? null,
      description: l.description,
      quantity: l.quantity,
      spec: l.spec,
      features: l.features,
      subcomponents: l.subcomponents,
      labour_hours_override: l.labour_hours_override ?? null,
      unit_price_override: l.unit_price_override ?? null,
      calculated_breakdown: l.calculated_breakdown,
      unit_price_ex_vat: l.unit_price_ex_vat,
      line_total_ex_vat: l.line_total_ex_vat,
    }));
    const { error: lErr } = await supabase.from("quote_items").insert(rows);
    if (lErr) return { error: `quote_items: ${lErr.message}` };
  }

  return { quote_id: quote.id, error: null };
}

export interface QuoteListRow {
  id: string;
  created_at: string;
  quote_reference: string;
  customer_name: string | null;
  project_name: string | null;
  status: string;
  subtotal_ex_vat: number;
  total_inc_vat: number;
}

export async function listQuotes(
  supabase: SupabaseClient,
  company_id: string
): Promise<QuoteListRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, created_at, quote_reference, customer_name, project_name, status, subtotal_ex_vat, total_inc_vat")
    .eq("company_id", company_id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    quote_reference: r.quote_reference,
    customer_name: r.customer_name,
    project_name: r.project_name,
    status: r.status,
    subtotal_ex_vat: Number(r.subtotal_ex_vat),
    total_inc_vat: Number(r.total_inc_vat),
  }));
}

// ---------------------------------------------------------------------------
// Product types reference (global table)
// ---------------------------------------------------------------------------

export interface ProductTypeRow {
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export async function loadProductTypes(
  supabase: SupabaseClient
): Promise<ProductTypeRow[]> {
  const { data } = await supabase
    .from("product_types")
    .select("code, name, description, sort_order")
    .order("sort_order");
  return data ?? [];
}
