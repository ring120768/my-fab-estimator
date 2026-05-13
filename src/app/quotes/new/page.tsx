"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";
import { LineItemEditor } from "@/components/LineItemEditor";
import { useCompany } from "@/lib/use-company";
import { useLibrary } from "@/lib/use-library";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCompany } from "@/lib/supabase/data-access";
import { saveQuote, type QuoteLineInput } from "@/lib/supabase/quotes";
import { calculateLineItem, rollUpQuote, ENGINE_VERSION_V2 } from "@/pricing/v2/quote";
import type { LineItemInput, LineItemResult } from "@/pricing/v2/types";
import { fmtMoney } from "@/lib/format";
import { importedScheduleToLines } from "@/lib/ai/to-line-items";
import type { ParsedSchedule } from "@/lib/ai/types";

type DraftLine = { id: string; input: LineItemInput; result: LineItemResult };

const IMPORT_KEY = "myFabEstimator.importedSchedule.v1";

export default function NewQuotePage() {
  const router = useRouter();
  const supabase = createClient();
  const { ctx, company, loaded: cLoaded } = useCompany();
  const { library, productTypes, loaded: libLoaded } = useLibrary();

  const [header, setHeader] = useState({
    quote_reference: autoRef(),
    customer_name: "",
    customer_company: "",
    customer_email: "",
    project_name: "",
    project_location: "",
    prepared_by: "",
    internal_notes: "",
  });

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (cLoaded && !ctx) router.replace("/onboarding/company");
  }, [cLoaded, ctx, router]);

  // ----- Pre-populate from an imported drawing schedule (if any) -----
  const [importedBanner, setImportedBanner] = useState<string | null>(null);
  useEffect(() => {
    if (!company || !library) return;
    try {
      const raw = sessionStorage.getItem(IMPORT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParsedSchedule;
      const { header: h, lines: importedLines } = importedScheduleToLines(parsed);
      setHeader((cur) => ({
        ...cur,
        quote_reference: h.quote_reference || cur.quote_reference,
        customer_name: h.customer_name || cur.customer_name,
        project_name: h.project_name || cur.project_name,
        project_location: h.project_location || cur.project_location,
        prepared_by: h.prepared_by || cur.prepared_by,
      }));
      const drafts = importedLines.map((input) => ({
        id: crypto.randomUUID(),
        input,
        result: calculateLineItem(input, library, company),
      }));
      setLines(drafts);
      setImportedBanner(
        `${importedLines.length} line item${importedLines.length === 1 ? "" : "s"} imported from drawing. Review each line and edit before saving.`
      );
      sessionStorage.removeItem(IMPORT_KEY);
    } catch {
      // ignore corrupt import data
    }
  }, [company, library]);

  const totals = useMemo(() => {
    if (!company) return null;
    return rollUpQuote(lines.map((l) => l.result), company);
  }, [lines, company]);

  if (!cLoaded || !libLoaded) return <div className="text-muted">Loading…</div>;
  if (!ctx || !company || !library) return <div className="text-muted">Setting up…</div>;

  const addOrUpdateLine = (input: LineItemInput, idx: number | null) => {
    const result = calculateLineItem(input, library, company);
    setEditingIdx(null);
    if (idx === null) {
      setLines((cur) => [...cur, { id: crypto.randomUUID(), input, result }]);
    } else {
      setLines((cur) => cur.map((l, i) => i === idx ? { ...l, input, result } : l));
    }
  };

  const removeLine = (idx: number) => {
    setLines((cur) => cur.filter((_, i) => i !== idx));
  };

  const moveLine = (idx: number, dir: -1 | 1) => {
    setLines((cur) => {
      const next = [...cur];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  };

  const handleSave = async () => {
    if (!totals) return;
    setSaving(true);
    setSaveError(null);
    const linesInput: QuoteLineInput[] = lines.map((l, i) => ({
      position: (i + 1) * 10,
      product_type: l.result.product_type,
      description: l.result.description,
      quantity: l.input.quantity,
      spec: l.input.spec,
      features: l.input.features,
      subcomponents: l.input.subcomponents,
      labour_hours_override: l.input.labour_hours_override,
      unit_price_override: l.input.unit_price_override,
      calculated_breakdown: l.result.breakdown!,
      unit_price_ex_vat: l.result.breakdown!.unit_price_ex_vat,
      line_total_ex_vat: l.result.breakdown!.line_total_ex_vat,
    }));
    const snap = {
      taken_at: new Date().toISOString(),
      engine_version: ENGINE_VERSION_V2,
      costing_rules: company.costing_rules,
      labour_rates: company.labour_rates,
    };
    const res = await saveQuote(supabase, ctx.company_id, header, linesInput, totals, snap);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    router.push("/quotes");
  };

  const allOk = lines.length > 0 && lines.every((l) => l.result.ok);

  const handleDiscard = () => {
    const hasContent = lines.length > 0
      || header.customer_name
      || header.project_name
      || header.customer_company
      || header.customer_email
      || header.internal_notes;
    if (hasContent) {
      const confirmed = window.confirm(
        "Discard this draft quote?\n\n" +
        "All line items and header data will be lost. This can't be undone."
      );
      if (!confirmed) return;
    }
    // Clear any imported schedule still in sessionStorage so it doesn't
    // re-populate on next visit.
    try { sessionStorage.removeItem(IMPORT_KEY); } catch { /* ignore */ }
    router.push("/quotes");
  };

  return (
    <div>
      <PageHeader
        title="New quote"
        description="Multi-line stainless steel fabrication quote. Add line items below — totals update live."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleDiscard} variant="secondary">
              Discard draft
            </Button>
            <Button onClick={handleSave} disabled={!allOk || saving}>
              {saving ? "Saving…" : "Save quote"}
            </Button>
          </div>
        }
      />

      {saveError && (
        <div className="rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad mb-4">
          {saveError}
        </div>
      )}

      {importedBanner && (
        <div className="rounded-md bg-accent/10 border border-accent/30 p-3 text-sm text-ink mb-4">
          <span className="font-medium">Imported from drawing.</span> {importedBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Quote header">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="Quote reference" value={header.quote_reference} onChange={(e) => setHeader({ ...header, quote_reference: e.target.value })} />
              <TextField label="Prepared by" value={header.prepared_by} onChange={(e) => setHeader({ ...header, prepared_by: e.target.value })} />
              <TextField label="Customer name" value={header.customer_name} onChange={(e) => setHeader({ ...header, customer_name: e.target.value })} />
              <TextField label="Customer company" value={header.customer_company} onChange={(e) => setHeader({ ...header, customer_company: e.target.value })} />
              <TextField label="Customer email" type="email" value={header.customer_email} onChange={(e) => setHeader({ ...header, customer_email: e.target.value })} />
              <TextField label="Project name" value={header.project_name} onChange={(e) => setHeader({ ...header, project_name: e.target.value })} />
              <TextField label="Project location" value={header.project_location} onChange={(e) => setHeader({ ...header, project_location: e.target.value })} />
              <TextField label="Internal notes" value={header.internal_notes} onChange={(e) => setHeader({ ...header, internal_notes: e.target.value })} hint="Not shown to customer" />
            </div>
          </Card>

          <Card title={`Line items (${lines.length})`}>
            {lines.length === 0 ? (
              <div className="text-sm text-muted py-6 text-center">
                No lines yet. Add your first below.
              </div>
            ) : (
              <ul className="space-y-3">
                {lines.map((l, i) => (
                  <li key={l.id} className="border border-border rounded-md p-3 bg-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted mt-1 shrink-0">
                        1.{String((i + 1) * 10).padStart(3, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink">{l.result.description || `[${l.result.product_type}]`}</div>
                        {!l.result.ok && (
                          <div className="text-xs text-bad mt-1">{l.result.validation_errors.join("; ")}</div>
                        )}
                        <div className="text-xs text-muted mt-1">
                          Qty {l.input.quantity} × {fmtMoney(l.result.breakdown?.unit_price_ex_vat ?? 0)}
                        </div>
                      </div>
                      <div className="text-sm font-medium tabular-nums shrink-0">
                        {fmtMoney(l.result.breakdown?.line_total_ex_vat ?? 0)}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 ml-2">
                        <button onClick={() => moveLine(i, -1)} className="text-xs text-muted hover:text-ink" title="Move up">▲</button>
                        <button onClick={() => moveLine(i, 1)} className="text-xs text-muted hover:text-ink" title="Move down">▼</button>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 ml-2">
                        <button onClick={() => setEditingIdx(i)} className="text-xs text-accent hover:underline">Edit</button>
                        <button onClick={() => removeLine(i)} className="text-xs text-bad hover:underline">Remove</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setEditingIdx(-1)}>
                + Add line item
              </Button>
            </div>
          </Card>

          {editingIdx !== null && (
            <LineItemEditor
              library={library}
              productTypes={productTypes}
              initial={editingIdx >= 0 ? lines[editingIdx]?.input : undefined}
              onSave={(input) => addOrUpdateLine(input, editingIdx === -1 ? null : editingIdx)}
              onCancel={() => setEditingIdx(null)}
            />
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <Card title="Totals">
            {totals ? (
              <div className="space-y-2 text-sm">
                <Line label="Subtotal ex VAT" value={totals.subtotal_ex_vat} />
                {totals.vat_rate > 0 && (
                  <Line label={`VAT (${totals.vat_rate}%)`} value={totals.vat_amount} muted />
                )}
                <div className="pt-3 mt-3 border-t border-border">
                  <Line label="Total inc VAT" value={totals.total_inc_vat} bold />
                </div>
                <div className="text-xs text-muted pt-3">
                  Engine v{ENGINE_VERSION_V2}. Costing snapshot saved with quote.
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">Add lines to see totals.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean; }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sm ${muted ? "text-muted" : "text-ink"} ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-semibold text-ink text-lg" : "text-ink"}`}>{fmtMoney(value)}</span>
    </div>
  );
}

function autoRef(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${mm}${yy}-${rand}`;
}
