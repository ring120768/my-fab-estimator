"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useEstimates } from "@/lib/use-estimates";
import { fmtMoney } from "@/lib/format";

export default function EstimatesListPage() {
  const { items, loaded } = useEstimates();

  return (
    <div>
      <PageHeader
        title="Estimates"
        description="All saved estimates. Each one stores a costing snapshot of the rates used at the time."
        actions={
          <Link href="/estimates/new">
            <Button>+ New estimate</Button>
          </Link>
        }
      />

      {!loaded ? (
        <div className="text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-sm text-muted py-6 text-center">
            No estimates yet.{" "}
            <Link href="/estimates/new" className="text-accent underline">
              Create your first estimate
            </Link>{" "}
            to test your costing matrix.
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 pr-3">Quote ref</th>
                <th className="pb-2 pr-3">Customer</th>
                <th className="pb-2 pr-3">Project</th>
                <th className="pb-2 pr-3">Spec</th>
                <th className="pb-2 pr-3 text-right">Sell ex VAT</th>
                <th className="pb-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{e.quote_reference}</td>
                  <td className="py-2 pr-3">{e.customer_name}</td>
                  <td className="py-2 pr-3 text-muted">{e.project_name}</td>
                  <td className="py-2 pr-3 text-muted">
                    {e.spec.length_mm}×{e.spec.depth_mm}×{e.spec.height_mm} mm,{" "}
                    {e.spec.material_grade}/{e.spec.sheet_thickness_mm}mm
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {fmtMoney(e.breakdown.sell_price_ex_vat)}
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
