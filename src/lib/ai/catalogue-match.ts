// Match AI-parsed bought-in line items against the equipment_catalogue.
// Returns a copy of the parsed schedule with catalogue_match populated where
// an item could be located. Two-tier matching:
//   1. Exact case-insensitive (manufacturer + model)
//   2. Normalized (lowercase, alphanumeric only — handles "iCombi Pro 10-1/1"
//      vs "ICOMBIPRO10/1" and similar drift between AI extraction and catalogue)
// Fuzzy / Levenshtein matching is intentionally out of scope here — it's a
// rabbit hole and the equipment picker (step 3) is the right safety net for
// anything that doesn't hit either of the two exact tiers.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedSchedule, ParsedLineItem } from "./types";

interface CatalogueRow {
  id: string;
  stock_code: string | null;
  manufacturer: string;
  model: string;
  list_price: number | null;
  default_supplier_discount_pct: number | null;
}

/** Normalize for fuzzy-equality matching — strip whitespace, punctuation, lowercase. */
function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lowercase + trim for case-insensitive exact match. */
function ci(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Enrich a parsed schedule with catalogue matches for every bought-in line.
 * Returns a new ParsedSchedule (does not mutate input).
 */
export async function enrichWithCatalogueMatches(
  supabase: SupabaseClient,
  company_id: string,
  schedule: ParsedSchedule
): Promise<ParsedSchedule> {
  const boughtIn = schedule.line_items.filter((it) => it.is_bought_in_equipment);
  if (boughtIn.length === 0) return schedule;

  // Collect manufacturers we'll need to fetch. The catalogue may have ~280
  // manufacturers total; we only need to load rows for manufacturers actually
  // mentioned in the schedule (cuts load to ~10-30 rows per drawing).
  const mfrs = Array.from(new Set(
    boughtIn.map((it) => ci(it.manufacturer)).filter(Boolean)
  ));
  if (mfrs.length === 0) return schedule;

  // Single fetch — case-insensitive OR list. Supabase doesn't have a native
  // ilike-in operator, so we OR-chain ilike clauses.
  const orClause = mfrs.map((m) => `manufacturer.ilike.${m}`).join(",");
  const { data, error } = await supabase
    .from("equipment_catalogue")
    .select("id, stock_code, manufacturer, model, list_price, default_supplier_discount_pct")
    .eq("company_id", company_id)
    .eq("active", true)
    .or(orClause);

  if (error || !data) {
    // Fail soft — return schedule unmodified. The £0 fallback + UI warning
    // will still flag the line for manual fix.
    return schedule;
  }

  const candidates = data as CatalogueRow[];

  // Build two indexes: exact (manufacturer + model, both ci) and normalized.
  const exactIdx = new Map<string, CatalogueRow>();
  const normIdx = new Map<string, CatalogueRow>();
  const stockIdx = new Map<string, CatalogueRow>();
  for (const r of candidates) {
    const ek = `${ci(r.manufacturer)}|${ci(r.model)}`;
    const nk = `${normalize(r.manufacturer)}|${normalize(r.model)}`;
    if (!exactIdx.has(ek)) exactIdx.set(ek, r);
    if (!normIdx.has(nk)) normIdx.set(nk, r);
    if (r.stock_code) {
      const sk = ci(r.stock_code);
      if (!stockIdx.has(sk)) stockIdx.set(sk, r);
    }
  }

  // Match each bought-in item.
  function matchOne(item: ParsedLineItem): ParsedLineItem {
    if (!item.is_bought_in_equipment) return item;
    if (!item.manufacturer || !item.model) return item;

    // Tier 1 — stock code (AI rarely extracts these, but cheap to try if model
    // field happens to contain a stock code)
    const sk = ci(item.model);
    if (sk && stockIdx.has(sk)) {
      return attach(item, stockIdx.get(sk)!, "stock_code");
    }

    // Tier 2 — exact (case-insensitive)
    const ek = `${ci(item.manufacturer)}|${ci(item.model)}`;
    if (exactIdx.has(ek)) {
      return attach(item, exactIdx.get(ek)!, "exact");
    }

    // Tier 3 — normalized
    const nk = `${normalize(item.manufacturer)}|${normalize(item.model)}`;
    if (normIdx.has(nk)) {
      return attach(item, normIdx.get(nk)!, "normalized");
    }

    return item;
  }

  function attach(
    item: ParsedLineItem,
    row: CatalogueRow,
    method: "stock_code" | "exact" | "normalized"
  ): ParsedLineItem {
    return {
      ...item,
      catalogue_match: {
        catalogue_id: row.id,
        stock_code: row.stock_code,
        manufacturer: row.manufacturer,
        model: row.model,
        list_price: Number(row.list_price ?? 0),
        supplier_discount_pct: Number(row.default_supplier_discount_pct ?? 0),
        match_method: method,
      },
    };
  }

  return {
    ...schedule,
    line_items: schedule.line_items.map(matchOne),
  };
}

/** Pure-function variant for unit testing — takes the catalogue rows directly. */
export function matchAgainstCatalogue(
  schedule: ParsedSchedule,
  catalogue: CatalogueRow[]
): ParsedSchedule {
  if (catalogue.length === 0) return schedule;

  const exactIdx = new Map<string, CatalogueRow>();
  const normIdx = new Map<string, CatalogueRow>();
  const stockIdx = new Map<string, CatalogueRow>();
  for (const r of catalogue) {
    const ek = `${ci(r.manufacturer)}|${ci(r.model)}`;
    const nk = `${normalize(r.manufacturer)}|${normalize(r.model)}`;
    if (!exactIdx.has(ek)) exactIdx.set(ek, r);
    if (!normIdx.has(nk)) normIdx.set(nk, r);
    if (r.stock_code) {
      const sk = ci(r.stock_code);
      if (!stockIdx.has(sk)) stockIdx.set(sk, r);
    }
  }

  return {
    ...schedule,
    line_items: schedule.line_items.map((item) => {
      if (!item.is_bought_in_equipment || !item.manufacturer || !item.model) return item;
      const sk = ci(item.model);
      if (sk && stockIdx.has(sk)) {
        return attachMatch(item, stockIdx.get(sk)!, "stock_code");
      }
      const ek = `${ci(item.manufacturer)}|${ci(item.model)}`;
      if (exactIdx.has(ek)) return attachMatch(item, exactIdx.get(ek)!, "exact");
      const nk = `${normalize(item.manufacturer)}|${normalize(item.model)}`;
      if (normIdx.has(nk)) return attachMatch(item, normIdx.get(nk)!, "normalized");
      return item;
    }),
  };
}

function attachMatch(
  item: ParsedLineItem,
  row: CatalogueRow,
  method: "stock_code" | "exact" | "normalized"
): ParsedLineItem {
  return {
    ...item,
    catalogue_match: {
      catalogue_id: row.id,
      stock_code: row.stock_code,
      manufacturer: row.manufacturer,
      model: row.model,
      list_price: Number(row.list_price ?? 0),
      supplier_discount_pct: Number(row.default_supplier_discount_pct ?? 0),
      match_method: method,
    },
  };
}
