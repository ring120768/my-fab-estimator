"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCompany } from "@/lib/supabase/data-access";
import type { CostBreakdown, CostingSnapshot, TableSpec } from "@/pricing/types";

export interface SavedEstimate {
  id: string;
  created_at: string;
  customer_name: string;
  project_name: string;
  quote_reference: string;
  spec: TableSpec;
  breakdown: CostBreakdown;
  snapshot: CostingSnapshot;
}

export interface NewEstimateInput {
  customer_name: string;
  project_name: string;
  quote_reference: string;
  spec: TableSpec;
  breakdown: CostBreakdown;
  snapshot: CostingSnapshot;
}

export async function saveEstimate(
  input: NewEstimateInput
): Promise<{ id?: string; error: string | null }> {
  const supabase = createClient();
  const ctx = await getCurrentCompany(supabase);
  if (!ctx) return { error: "Not signed in." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      company_id: ctx.company_id,
      created_by: user.id,
      quote_reference: input.quote_reference,
      customer_name: input.customer_name,
      project_name: input.project_name,
      product_type: "stainless_steel_table",
      input_data: input.spec,
      cost_breakdown: input.breakdown,
      costing_snapshot: input.snapshot,
      sell_price_ex_vat: input.breakdown.sell_price_ex_vat,
      vat_amount: input.breakdown.vat_amount,
      total_price_inc_vat: input.breakdown.total_inc_vat,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data!.id, error: null };
}

export function useEstimates() {
  const supabase = createClient();
  const [items, setItems] = useState<SavedEstimate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const ctx = await getCurrentCompany(supabase);
      if (!ctx) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("estimates")
        .select("id, created_at, customer_name, project_name, quote_reference, input_data, cost_breakdown, costing_snapshot")
        .eq("company_id", ctx.company_id)
        .order("created_at", { ascending: false });
      if (data) {
        setItems(
          data.map((e) => ({
            id: e.id,
            created_at: e.created_at,
            customer_name: e.customer_name ?? "(no customer)",
            project_name: e.project_name ?? "Stainless steel table",
            quote_reference: e.quote_reference,
            spec: e.input_data as TableSpec,
            breakdown: e.cost_breakdown as CostBreakdown,
            snapshot: e.costing_snapshot as CostingSnapshot,
          }))
        );
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loaded };
}
