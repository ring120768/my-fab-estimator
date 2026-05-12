"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCompany } from "@/lib/supabase/data-access";
import { listQuotes, type QuoteListRow } from "@/lib/supabase/quotes";

export function useQuotes() {
  const supabase = createClient();
  const [items, setItems] = useState<QuoteListRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const ctx = await getCurrentCompany(supabase);
      if (!ctx) {
        setLoaded(true);
        return;
      }
      const rows = await listQuotes(supabase, ctx.company_id);
      setItems(rows);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loaded };
}
