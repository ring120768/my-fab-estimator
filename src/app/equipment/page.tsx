"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { TextField } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCompany } from "@/lib/supabase/data-access";
import {
  listEquipment,
  listSupplierTerms,
  resolveDiscountPct,
  type EquipmentRow,
  type SupplierTermsRow,
} from "@/lib/supabase/equipment";
import { fmtMoney } from "@/lib/format";

export default function EquipmentCataloguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<EquipmentRow[]>([]);
  const [terms, setTerms] = useState<SupplierTermsRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const ctx = await getCurrentCompany(supabase);
      if (!ctx) {
        router.replace("/onboarding/company");
        return;
      }
      const [eq, st] = await Promise.all([
        listEquipment(supabase, ctx.company_id),
        listSupplierTerms(supabase, ctx.company_id),
      ]);
      setItems(eq);
      setTerms(st);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter so search is snappy.
  const filtered = useMemo(() => {
    if (!search) return items;
    const t = search.toLowerCase();
    return items.filter(
      (it) =>
        it.manufacturer.toLowerCase().includes(t) ||
        it.model.toLowerCase().includes(t) ||
        (it.description ?? "").toLowerCase().includes(t)
    );
  }, [items, search]);

  if (!loaded) return <div className="text-muted">Loading…</div>;

  // Group by manufacturer for nicer display
  const byMfr = new Map<string, EquipmentRow[]>();
  for (const it of filtered) {
    const arr = byMfr.get(it.manufacturer) ?? [];
    arr.push(it);
    byMfr.set(it.manufacturer, arr);
  }

  return (
    <div>
      <PageHeader
        title="Equipment catalogue"
        description="Bought-in equipment with list prices, supplier discounts and install hours. Imported from CCE's master template — edit anything per your real numbers."
      />

      <Card className="mb-4">
        <TextField
          label={`Search catalogue (${items.length} items, ${byMfr.size} manufacturers)`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Rational, iCombi, fryer, glasswasher…"
        />
      </Card>

      <div className="space-y-4">
        {[...byMfr.entries()].slice(0, 20).map(([mfr, list]) => {
          const supplierTerm = terms.find((t) => t.supplier.toLowerCase() === mfr.toLowerCase());
          return (
            <Card key={mfr} title={`${mfr} (${list.length} item${list.length === 1 ? "" : "s"})`}>
              {supplierTerm && (
                <div className="text-xs text-muted mb-3">
                  Default supplier discount: <strong>{supplierTerm.discount_pct ?? "—"}%</strong>
                  {supplierTerm.warranty && <> · Warranty: {supplierTerm.warranty}</>}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-2 pr-3">Model</th>
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3 text-right">List price</th>
                      <th className="pb-2 pr-3 text-right">Discount</th>
                      <th className="pb-2 pr-3 text-right">Install hrs (E/A/F)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((it) => {
                      const disc = resolveDiscountPct(it, terms);
                      return (
                        <tr key={it.id} className="border-t border-border">
                          <td className="py-2 pr-3 font-medium">{it.model || "—"}</td>
                          <td className="py-2 pr-3 text-muted max-w-md">
                            <div className="truncate">{it.description || "—"}</div>
                            {it.cost_notes && (
                              <div className="text-[10px] text-warn italic">{it.cost_notes}</div>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {it.list_price == null ? "—" : fmtMoney(it.list_price)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {disc == null ? "—" : `${disc}%`}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {it.install_hours_eng}/{it.install_hours_asst}/{it.install_hours_foreman}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {byMfr.size > 20 && (
          <div className="text-xs text-muted text-center py-4">
            Showing first 20 of {byMfr.size} manufacturers. Use search above to narrow down.
          </div>
        )}
      </div>
    </div>
  );
}
