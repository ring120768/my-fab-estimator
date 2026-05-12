"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCompany } from "@/lib/supabase/data-access";
import { loadLibrary, loadProductTypes, type ProductTypeRow } from "@/lib/supabase/quotes";
import type { QuoteEngineLibrary } from "@/pricing/v2/types";

export function useLibrary() {
  const supabase = createClient();
  const [library, setLibrary] = useState<QuoteEngineLibrary | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ctx = await getCurrentCompany(supabase);
      if (!ctx) {
        setLoaded(true);
        return;
      }
      try {
        const [lib, pts] = await Promise.all([
          loadLibrary(supabase, ctx.company_id),
          loadProductTypes(supabase),
        ]);
        setLibrary(lib);
        setProductTypes(pts);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { library, productTypes, loaded, error };
}
