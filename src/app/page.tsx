"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatusChip } from "@/components/Card";
import { useCompany } from "@/lib/use-company";
import { useEstimates } from "@/lib/use-estimates";
import { fmtMoney } from "@/lib/format";

export default function DashboardPage() {
  const router = useRouter();
  const { ctx, company, loaded: cLoaded } = useCompany();
  const { items, loaded: eLoaded } = useEstimates();

  // No company yet → redirect to onboarding.
  useEffect(() => {
    if (cLoaded && !ctx) router.replace("/onboarding/company");
  }, [cLoaded, ctx, router]);

  if (!cLoaded || !eLoaded) return <div className="text-muted">Loading…</div>;
  if (!ctx || !company) return <div className="text-muted">Setting up…</div>;

  const checks: Array<{ label: string; ok: boolean }> = [
    { label: "Labour: fabrication rate", ok: company.labour_rates.some((r) => r.rate_type === "fabrication") },
    { label: "Labour: welding rate", ok: company.labour_rates.some((r) => r.rate_type === "welding") },
    { label: "Material: 304 sheet 1.2mm", ok: company.material_rates.some((m) => m.category === "sheet" && m.grade === "304" && m.thickness_mm === 1.2) },
    { label: "Material: leg profile (304)", ok: company.material_rates.some((m) => (m.category === "box_section" || m.category === "tube") && m.grade === "304") },
    { label: "Costing rules: margin set", ok: company.costing_rules.default_margin_percentage > 0 },
  ];
  const okCount = checks.filter((c) => c.ok).length;
  const health = Math.round((okCount / checks.length) * 100);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${ctx.company_name}. Quick view of your costing readiness and recent estimates.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-muted">Costing matrix health</div>
          <div className="text-3xl font-semibold text-ink mt-1">{health}%</div>
          <div className="text-xs text-muted mt-1">{okCount} of {checks.length} required items present</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">Saved estimates</div>
          <div className="text-3xl font-semibold text-ink mt-1">{items.length}</div>
          <div className="text-xs text-muted mt-1">Stored in your Supabase project</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">Pricing method</div>
          <div className="text-3xl font-semibold text-ink mt-1 capitalize">
            {company.costing_rules.pricing_method}
          </div>
          <div className="text-xs text-muted mt-1">
            Default {company.costing_rules.default_margin_percentage}%
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Link href="/estimates/new">
          <Card className="hover:border-accent cursor-pointer h-full">
            <div className="font-medium text-ink">Create estimate</div>
            <div className="text-xs text-muted mt-1">Stainless steel table builder</div>
          </Card>
        </Link>
        <Link href="/costing-matrix">
          <Card className="hover:border-accent cursor-pointer h-full">
            <div className="font-medium text-ink">Update costing matrix</div>
            <div className="text-xs text-muted mt-1">Edit material, labour and process rates</div>
          </Card>
        </Link>
        <Link href="/estimates">
          <Card className="hover:border-accent cursor-pointer h-full">
            <div className="font-medium text-ink">Review estimates</div>
            <div className="text-xs text-muted mt-1">See past estimates and snapshots</div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Costing readiness">
          <ul className="space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between">
                <span className="text-ink">{c.label}</span>
                <StatusChip status={c.ok ? "complete" : "missing"} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent estimates">
          {items.length === 0 ? (
            <div className="text-sm text-muted">
              No estimates yet.{" "}
              <Link href="/estimates/new" className="text-accent underline">
                Create your first
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between items-baseline border-b border-border pb-2 last:border-0"
                >
                  <div>
                    <div className="font-medium text-ink">{e.customer_name}</div>
                    <div className="text-xs text-muted">
                      {e.quote_reference} • {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-ink tabular-nums">
                    {fmtMoney(e.breakdown.sell_price_ex_vat)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
