// Data access for the equipment catalogue + supplier terms.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface EquipmentRow {
  id: string;
  // CCE-style stock code, e.g. "RAT1-E00055-AC". Optional — older items
  // seeded before migration 0010 won't have one.
  stock_code: string | null;
  manufacturer: string;
  model: string;
  description: string | null;
  category: string | null;
  list_price: number | null;
  cost_notes: string | null;
  default_supplier_discount_pct: number | null;
  default_markup_pct: number | null;
  install_hours_eng: number;
  install_hours_asst: number;
  install_hours_foreman: number;
  // Traceability — last quote reference and date this item was sold on.
  // Surfaces "this price was last quoted Jan 2026" for the estimator.
  last_quote_ref: string | null;
  last_quote_date: string | null;
  active: boolean;
}

export interface SupplierTermsRow {
  id: string;
  supplier: string;
  equipment_category: string | null;
  discount_pct: number | null;
  warranty: string | null;
}

export async function listEquipment(
  supabase: SupabaseClient,
  company_id: string,
  search?: string
): Promise<EquipmentRow[]> {
  let q = supabase
    .from("equipment_catalogue")
    .select("id, stock_code, manufacturer, model, description, category, list_price, cost_notes, default_supplier_discount_pct, default_markup_pct, install_hours_eng, install_hours_asst, install_hours_foreman, last_quote_ref, last_quote_date, active")
    .eq("company_id", company_id)
    .eq("active", true)
    .order("manufacturer")
    .order("model");
  if (search && search.length > 0) {
    const term = `%${search}%`;
    q = q.or(`manufacturer.ilike.${term},model.ilike.${term},description.ilike.${term}`);
  }
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    stock_code: r.stock_code ?? null,
    manufacturer: r.manufacturer,
    model: r.model,
    description: r.description,
    category: r.category,
    list_price: r.list_price == null ? null : Number(r.list_price),
    cost_notes: r.cost_notes,
    default_supplier_discount_pct: r.default_supplier_discount_pct == null ? null : Number(r.default_supplier_discount_pct),
    default_markup_pct: r.default_markup_pct == null ? null : Number(r.default_markup_pct),
    install_hours_eng: Number(r.install_hours_eng),
    install_hours_asst: Number(r.install_hours_asst),
    last_quote_ref: r.last_quote_ref ?? null,
    last_quote_date: r.last_quote_date ?? null,
    install_hours_foreman: Number(r.install_hours_foreman),
    active: r.active,
  }));
}

export async function listSupplierTerms(
  supabase: SupabaseClient,
  company_id: string
): Promise<SupplierTermsRow[]> {
  const { data } = await supabase
    .from("supplier_terms")
    .select("id, supplier, equipment_category, discount_pct, warranty")
    .eq("company_id", company_id)
    .order("supplier");
  return (data ?? []).map((r) => ({
    id: r.id,
    supplier: r.supplier,
    equipment_category: r.equipment_category,
    discount_pct: r.discount_pct == null ? null : Number(r.discount_pct),
    warranty: r.warranty,
  }));
}

/** Resolve the discount % to use for a given equipment item.
 *  Precedence: item.default_supplier_discount_pct → supplier_terms match → null. */
export function resolveDiscountPct(
  item: EquipmentRow,
  supplierTerms: SupplierTermsRow[]
): number | null {
  if (item.default_supplier_discount_pct != null) return item.default_supplier_discount_pct;
  const match = supplierTerms.find(
    (t) => t.supplier.toLowerCase() === item.manufacturer.toLowerCase()
  );
  return match?.discount_pct ?? null;
}
