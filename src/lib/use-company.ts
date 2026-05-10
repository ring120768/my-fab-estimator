// Supabase-backed hook. Loads the current user's company costing data, lets
// the UI mutate it in memory, and persists on save().

"use client";

import { useEffect, useState } from "react";
import type { CompanyCostingData } from "@/pricing/types";
import { createClient } from "@/lib/supabase/client";
import {
  type CompanyContext,
  getCurrentCompany,
  loadCompanyData,
  saveCompanyData,
} from "@/lib/supabase/data-access";

export function useCompany() {
  const supabase = createClient();
  const [ctx, setCtx] = useState<CompanyContext | null>(null);
  const [company, setCompany] = useState<CompanyCostingData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCompany(supabase);
      setCtx(c);
      if (!c) {
        setLoaded(true);
        return;
      }
      const data = await loadCompanyData(supabase, c.company_id);
      if (!data) {
        setError("Failed to load costing data.");
      } else {
        setCompany(data);
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In-memory edit (does not persist until save() called).
  const update = (next: CompanyCostingData) => setCompany(next);

  const save = async () => {
    if (!ctx || !company) return { error: "No company loaded." };
    setSaving(true);
    const result = await saveCompanyData(supabase, ctx.company_id, company);
    setSaving(false);
    if (result.error) setError(result.error);
    return result;
  };

  return { ctx, company, update, save, loaded, error, saving };
}
