"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField, ToggleField } from "@/components/Field";
import { useCompany } from "@/lib/use-company";
import { saveEstimate } from "@/lib/use-estimates";
import { calculateTableEstimate } from "@/pricing/engine";
import { fmtMoney } from "@/lib/format";
import type { TableSpec } from "@/pricing/types";

const DEFAULT_SPEC: TableSpec = {
  quantity: 1,
  length_mm: 1800,
  depth_mm: 700,
  height_mm: 900,
  material_grade: "304",
  sheet_thickness_mm: 1.2,
  finish: "brushed",
  undershelf: true,
  rear_upstand: false,
  upstand_height_mm: 100,
  leg_type: "box_section",
  number_of_legs: 4,
  adjustable_feet: true,
  construction: "welded",
};

export default function NewEstimatePage() {
  const router = useRouter();
  const { ctx, company, loaded } = useCompany();
  const [spec, setSpec] = useState<TableSpec>(DEFAULT_SPEC);
  const [job, setJob] = useState({
    customer_name: "",
    project_name: "",
    quote_reference: "",
  });
  const [saved, setSaved] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded && !ctx) router.replace("/onboarding/company");
  }, [loaded, ctx, router]);

  const result = useMemo(
    () => (loaded && company ? calculateTableEstimate(spec, company) : null),
    [spec, company, loaded]
  );

  const setField = <K extends keyof TableSpec>(key: K, value: TableSpec[K]) =>
    setSpec((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    if (!result?.ok || !result.breakdown || !result.snapshot) return;
    setSaving(true);
    setSavingError(null);
    const res = await saveEstimate({
      customer_name: job.customer_name || "(no customer)",
      project_name: job.project_name || "Stainless steel table",
      quote_reference: job.quote_reference || `Q-${Date.now().toString().slice(-6)}`,
      spec,
      breakdown: result.breakdown,
      snapshot: result.snapshot,
    });
    setSaving(false);
    if (res.error) {
      setSavingError(res.error);
      return;
    }
    setSaved(res.id ?? "saved");
  };

  if (!loaded) return <div className="text-muted">Loading…</div>;
  if (!ctx || !company) return <div className="text-muted">Setting up…</div>;

  return (
    <div>
      <PageHeader
        title="New estimate — stainless steel table"
        description="Live calc: change any field on the left and the cost breakdown on the right updates immediately."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Job details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="Customer name" value={job.customer_name} onChange={(e) => setJob({ ...job, customer_name: e.target.value })} />
              <TextField label="Project name" value={job.project_name} onChange={(e) => setJob({ ...job, project_name: e.target.value })} />
              <TextField label="Quote reference" value={job.quote_reference} onChange={(e) => setJob({ ...job, quote_reference: e.target.value })} hint="Leave blank to auto-generate" />
            </div>
          </Card>

          <Card title="Dimensions & quantity">
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Length (mm)" value={spec.length_mm} onChange={(e) => setField("length_mm", Number(e.target.value))} />
              <NumberField label="Depth (mm)" value={spec.depth_mm} onChange={(e) => setField("depth_mm", Number(e.target.value))} />
              <NumberField label="Height (mm)" value={spec.height_mm} onChange={(e) => setField("height_mm", Number(e.target.value))} />
              <NumberField label="Quantity" value={spec.quantity} onChange={(e) => setField("quantity", Number(e.target.value))} />
            </div>
          </Card>

          <Card title="Material & specification">
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Material grade" value={spec.material_grade} onChange={(e) => setField("material_grade", e.target.value)} options={[{ value: "304", label: "304" }, { value: "316", label: "316" }]} />
              <NumberField label="Sheet thickness (mm)" step="0.1" value={spec.sheet_thickness_mm} onChange={(e) => setField("sheet_thickness_mm", Number(e.target.value))} />
              <SelectField label="Finish" value={spec.finish} onChange={(e) => setField("finish", e.target.value as TableSpec["finish"])} options={[{ value: "mill", label: "Mill" }, { value: "brushed", label: "Brushed" }, { value: "polished", label: "Polished" }]} />
              <SelectField label="Construction" value={spec.construction} onChange={(e) => setField("construction", e.target.value as TableSpec["construction"])} options={[{ value: "welded", label: "Welded" }, { value: "bolted", label: "Bolted" }]} />
              <SelectField label="Leg type" value={spec.leg_type} onChange={(e) => setField("leg_type", e.target.value as TableSpec["leg_type"])} options={[{ value: "box_section", label: "Box section" }, { value: "tube", label: "Tube" }, { value: "angle", label: "Angle" }]} />
              <NumberField label="Number of legs" value={spec.number_of_legs} onChange={(e) => setField("number_of_legs", Number(e.target.value))} />
            </div>
          </Card>

          <Card title="Options">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleField label="Undershelf" hint="Adds a second sheet underneath the top." checked={spec.undershelf} onChange={(v) => setField("undershelf", v)} />
              <ToggleField label="Adjustable feet" hint="Levelling feet on each leg." checked={spec.adjustable_feet} onChange={(v) => setField("adjustable_feet", v)} />
              <ToggleField label="Rear upstand" hint="Stainless upstand along the back edge." checked={spec.rear_upstand} onChange={(v) => setField("rear_upstand", v)} />
              {spec.rear_upstand && (
                <NumberField label="Upstand height (mm)" value={spec.upstand_height_mm} onChange={(e) => setField("upstand_height_mm", Number(e.target.value))} />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <ResultPanel result={result} onSave={handleSave} saved={saved} saving={saving} savingError={savingError} />
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onSave,
  saved,
  saving,
  savingError,
}: {
  result: ReturnType<typeof calculateTableEstimate> | null;
  onSave: () => void;
  saved: string | null;
  saving: boolean;
  savingError: string | null;
}) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <Card title="Cannot generate quote">
        <div className="space-y-3">
          <div className="rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad">
            <div className="font-semibold mb-1">Missing or invalid data</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.validation_errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
          <p className="text-sm text-muted">
            Add the missing rates in the{" "}
            <Link href="/costing-matrix" className="text-accent underline">Costing Matrix</Link>, then try again.
          </p>
        </div>
      </Card>
    );
  }

  const b = result.breakdown!;

  return (
    <>
      <Card title="Cost breakdown">
        <div className="space-y-2 text-sm">
          <Line label="Material / unit" value={b.material_cost_per_unit} />
          <Line label="Labour / unit" value={b.labour_cost_per_unit} />
          <Line label="Consumables / unit" value={b.consumables_cost_per_unit} muted />
          <Line label="Build cost / unit" value={b.build_cost_per_unit} bold />
          <Line label="Overhead / unit" value={b.overhead_cost_per_unit} muted />
          <div className="pt-3 mt-3 border-t border-border">
            <Line label={`× ${b.quantity}  total cost before margin`} value={b.total_cost_before_margin} bold />
          </div>
        </div>
      </Card>

      <Card title="Sell price">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted">{b.pricing_method === "margin" ? "Margin" : "Markup"} {b.margin_or_markup_percentage}%</span>
            <span className="text-3xl font-semibold text-ink">{fmtMoney(b.sell_price_ex_vat)}</span>
          </div>
          <div className="text-xs text-muted">excluding VAT</div>
          {b.vat_rate > 0 && (
            <>
              <Line label={`VAT (${b.vat_rate}%)`} value={b.vat_amount} muted />
              <Line label="Total inc VAT" value={b.total_inc_vat} bold />
            </>
          )}
        </div>
      </Card>

      <Card title="Detail lines">
        <div className="space-y-1 text-xs">
          {b.material_lines.map((l, i) => (
            <div key={`m${i}`} className="flex justify-between gap-3">
              <span className="text-muted truncate">{l.label}</span>
              <span className="text-ink shrink-0">{fmtMoney(l.amount)}</span>
            </div>
          ))}
          <div className="border-t border-border my-2" />
          {b.labour_lines.map((l, i) => (
            <div key={`l${i}`} className="flex justify-between gap-3">
              <span className="text-muted truncate">{l.label}</span>
              <span className="text-ink shrink-0">{fmtMoney(l.amount)}</span>
            </div>
          ))}
        </div>
      </Card>

      {result.assumptions.length > 0 && (
        <Card title="Assumptions">
          <ul className="text-xs text-muted space-y-1 list-disc list-inside">
            {result.assumptions.map((a, i) => (<li key={i}>{a}</li>))}
          </ul>
        </Card>
      )}

      {savingError && (
        <div className="rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad">{savingError}</div>
      )}

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving || !!saved}>
          {saved ? "Saved" : saving ? "Saving…" : "Save estimate"}
        </Button>
        {saved && (
          <Link href="/estimates"><Button variant="secondary">View estimates</Button></Link>
        )}
      </div>
    </>
  );
}

function Line({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean; }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sm ${muted ? "text-muted" : "text-ink"} ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-semibold text-ink" : "text-ink"}`}>{fmtMoney(value)}</span>
    </div>
  );
}
