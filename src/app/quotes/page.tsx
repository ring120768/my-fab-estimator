"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useQuotes } from "@/lib/use-quotes";
import { fmtMoney } from "@/lib/format";

export default function QuotesListPage() {
  const { items, loaded } = useQuotes();

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="All saved multi-line quotes. Each one stores a costing snapshot of the rates used at the time."
        actions={
          <Link href="/quotes/new">
            <Button>+ New quote</Button>
          </Link>
        }
      />

      {!loaded ? (
        <div className="text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-sm text-muted py-6 text-center">
            No quotes yet.{" "}
            <Link href="/quotes/new" className="text-accent underline">
              Create your first quote
            </Link>{" "}
            to test the new multi-line builder.
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
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3 text-right">Subtotal ex VAT</th>
                <th className="pb-2 pr-3 text-right">Total inc VAT</th>
                <th className="pb-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{q.quote_reference}</td>
                  <td className="py-2 pr-3">{q.customer_name ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{q.project_name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-soft text-muted capitalize">
                      {q.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(q.subtotal_ex_vat)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmtMoney(q.total_inc_vat)}</td>
                  <td className="py-2 pr-3 text-muted">{new Date(q.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
