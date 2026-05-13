"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, ToggleField } from "@/components/Field";
import { useCompany } from "@/lib/use-company";
import type {
  CompanyCostingData,
  LabourRate,
  MaterialRate,
  ProcessRate,
} from "@/pricing/types";

export default function CostingMatrixPage() {
  const router = useRouter();
  const { ctx, company, update, save, loaded, error, saving } = useCompany();

  useEffect(() => {
    if (loaded && !ctx) router.replace("/onboarding/company");
  }, [loaded, ctx, router]);

  // If the URL has a hash like #rules, scroll the matching card into view.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, [loaded]);

  if (!loaded) return <div className="text-muted">Loading…</div>;
  if (!ctx || !company) return <div className="text-muted">Setting up…</div>;

  return (
    <div>
      <PageHeader
        title="Costing Matrix"
        description="Your live company costing data. Estimates use these rates exactly — missing rows surface as errors, never silent defaults."
        actions={
          <Button onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {error && (
        <div className="rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <RulesCard company={company} update={update} />
        <LabourCard company={company} update={update} />
        <MaterialsCard company={company} update={update} />
        <ProcessesCard company={company} update={update} />
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function RulesCard({
  company,
  update,
}: {
  company: CompanyCostingData;
  update: (c: CompanyCostingData) => void;
}) {
  const r = company.costing_rules;
  const set = (patch: Partial<typeof r>) =>
    update({ ...company, costing_rules: { ...r, ...patch } });

  // Critical-field validation — flag these in red so the user can see what's wrong
  const marginMissing = !r.default_margin_percentage || r.default_margin_percentage <= 0;
  const minMarginMissing = r.minimum_margin_percentage == null;
  const hasCriticalIssue = marginMissing;

  return (
    <div id="rules" className={hasCriticalIssue ? "ring-2 ring-bad rounded-lg" : ""}>
      <Card title={hasCriticalIssue ? "⚠ Costing rules & margins — action required" : "Costing rules & margins"}>
      {hasCriticalIssue && (
        <div className="mb-4 rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad">
          <strong>Default margin is not set.</strong> The pricing engine can&rsquo;t produce
          sell prices until this is a positive number. Set it below (e.g. <code>30</code>
          for a 30% margin) and click <strong>Save changes</strong>.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <NumberField label="Standard waste %" value={r.standard_waste_percentage} onChange={(e) => set({ standard_waste_percentage: Number(e.target.value) })} />
        <NumberField label="Consumables %" value={r.consumables_percentage} onChange={(e) => set({ consumables_percentage: Number(e.target.value) })} />
        <NumberField label="Overhead %" value={r.overhead_percentage} onChange={(e) => set({ overhead_percentage: Number(e.target.value) })} />
        <SelectField
          label="Pricing method"
          value={r.pricing_method}
          onChange={(e) => set({ pricing_method: e.target.value as "margin" | "markup" })}
          options={[
            { value: "margin", label: "Margin (% of sell price)" },
            { value: "markup", label: "Markup (% added to cost)" },
          ]}
          hint={r.pricing_method === "margin" ? "Sell = cost / (1 − margin%)" : "Sell = cost × (1 + markup%)"}
        />
        <div id="default-margin" className={marginMissing ? "ring-2 ring-bad rounded-md p-1 -m-1" : ""}>
          <NumberField
            label={marginMissing ? "Default % ⚠ Required" : "Default %"}
            value={r.default_margin_percentage}
            onChange={(e) => set({ default_margin_percentage: Number(e.target.value) })}
            hint={marginMissing ? "Set to e.g. 30 for a 30% margin" : undefined}
          />
        </div>
        <NumberField label="Minimum margin %" value={r.minimum_margin_percentage} onChange={(e) => set({ minimum_margin_percentage: Number(e.target.value) })} />
        <NumberField label="Min order value" value={r.minimum_order_value} onChange={(e) => set({ minimum_order_value: Number(e.target.value) })} />
        <NumberField label="Rounding unit" value={r.rounding_unit} onChange={(e) => set({ rounding_unit: Number(e.target.value) })} />
        <NumberField label="VAT rate %" value={r.vat_rate} onChange={(e) => set({ vat_rate: Number(e.target.value) })} />
      </div>
      <div className="mt-4 flex gap-6">
        <ToggleField label="Round sell prices" checked={r.rounding_enabled} onChange={(v) => set({ rounding_enabled: v })} />
        <ToggleField label="VAT registered" checked={r.vat_registered} onChange={(v) => set({ vat_registered: v })} />
      </div>
      </Card>
    </div>
  );
}

function LabourCard({
  company,
  update,
}: {
  company: CompanyCostingData;
  update: (c: CompanyCostingData) => void;
}) {
  const setRate = (idx: number, hourly_rate: number) => {
    const next = [...company.labour_rates];
    next[idx] = { ...next[idx]!, hourly_rate };
    update({ ...company, labour_rates: next });
  };

  return (
    <Card title="Labour rates (per hour)">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {company.labour_rates.map((r, i) => (
          <NumberField
            key={r.rate_type}
            label={r.rate_type.charAt(0).toUpperCase() + r.rate_type.slice(1)}
            value={r.hourly_rate}
            onChange={(e) => setRate(i, Number(e.target.value))}
          />
        ))}
      </div>
    </Card>
  );
}

function MaterialsCard({
  company,
  update,
}: {
  company: CompanyCostingData;
  update: (c: CompanyCostingData) => void;
}) {
  const set = (i: number, patch: Partial<MaterialRate>) => {
    const next = [...company.material_rates];
    next[i] = { ...next[i]!, ...patch };
    update({ ...company, material_rates: next });
  };

  const add = () =>
    update({
      ...company,
      material_rates: [
        ...company.material_rates,
        { category: "sheet", grade: "304", thickness_mm: 1.2, unit: "m2", unit_cost: 0 },
      ],
    });

  const remove = (i: number) => {
    update({ ...company, material_rates: company.material_rates.filter((_, idx) => idx !== i) });
  };

  return (
    <Card title="Material rates">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-3">Category</th>
              <th className="pb-2 pr-3">Grade</th>
              <th className="pb-2 pr-3">Thickness mm</th>
              <th className="pb-2 pr-3">Size label</th>
              <th className="pb-2 pr-3">Unit</th>
              <th className="pb-2 pr-3 text-right">Unit cost</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {company.material_rates.map((m, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 pr-3">
                  <select value={m.category} onChange={(e) => set(i, { category: e.target.value as MaterialRate["category"] })} className="rounded border border-border px-2 py-1 text-sm">
                    <option value="sheet">sheet</option>
                    <option value="box_section">box_section</option>
                    <option value="tube">tube</option>
                    <option value="angle">angle</option>
                    <option value="feet">feet</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input value={m.grade ?? ""} onChange={(e) => set(i, { grade: e.target.value || undefined })} className="rounded border border-border px-2 py-1 text-sm w-20" />
                </td>
                <td className="py-2 pr-3">
                  <input type="number" step="0.1" value={m.thickness_mm ?? ""} onChange={(e) => set(i, { thickness_mm: e.target.value ? Number(e.target.value) : undefined })} className="rounded border border-border px-2 py-1 text-sm w-24" />
                </td>
                <td className="py-2 pr-3">
                  <input value={m.size_label ?? ""} onChange={(e) => set(i, { size_label: e.target.value || undefined })} className="rounded border border-border px-2 py-1 text-sm w-28" />
                </td>
                <td className="py-2 pr-3">
                  <select value={m.unit} onChange={(e) => set(i, { unit: e.target.value as MaterialRate["unit"] })} className="rounded border border-border px-2 py-1 text-sm">
                    <option value="m2">m²</option>
                    <option value="metre">metre</option>
                    <option value="each">each</option>
                  </select>
                </td>
                <td className="py-2 pr-3 text-right">
                  <input type="number" step="0.01" value={m.unit_cost} onChange={(e) => set(i, { unit_cost: Number(e.target.value) })} className="rounded border border-border px-2 py-1 text-sm w-24 text-right" />
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => remove(i)} className="text-bad text-xs hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Button variant="secondary" onClick={add}>+ Add material</Button>
      </div>
    </Card>
  );
}

function ProcessesCard({
  company,
  update,
}: {
  company: CompanyCostingData;
  update: (c: CompanyCostingData) => void;
}) {
  const set = (i: number, patch: Partial<ProcessRate>) => {
    const next = [...company.process_rates];
    next[i] = { ...next[i]!, ...patch };
    update({ ...company, process_rates: next });
  };

  const labourTypes: Array<LabourRate["rate_type"]> = ["fabrication", "welding", "polishing", "cad", "installation"];

  return (
    <Card title="Process rates">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-3">Process</th>
              <th className="pb-2 pr-3">Basis</th>
              <th className="pb-2 pr-3 text-right">Time (min)</th>
              <th className="pb-2 pr-3">Labour rate</th>
            </tr>
          </thead>
          <tbody>
            {company.process_rates.map((p, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 pr-3 font-medium">{p.process_name}</td>
                <td className="py-2 pr-3 text-muted">{p.basis}</td>
                <td className="py-2 pr-3 text-right">
                  <input type="number" step="0.5" value={p.time_minutes} onChange={(e) => set(i, { time_minutes: Number(e.target.value) })} className="rounded border border-border px-2 py-1 text-sm w-24 text-right" />
                </td>
                <td className="py-2 pr-3">
                  <select value={p.labour_rate_type} onChange={(e) => set(i, { labour_rate_type: e.target.value as LabourRate["rate_type"] })} className="rounded border border-border px-2 py-1 text-sm">
                    {labourTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
