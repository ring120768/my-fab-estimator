"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatusChip } from "@/components/Card";
import { Button } from "@/components/Button";
import type { ParseResult, ParsedLineItem } from "@/lib/ai/types";
import type { ReadinessCheck, ReadinessReport } from "@/app/api/check-readiness/route";

export default function ImportSchedulePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/check-readiness");
        if (res.ok) setReadiness(await res.json());
      } catch {
        // ignore — pre-flight is advisory; user can still attempt the upload
      } finally {
        setReadinessLoading(false);
      }
    })();
  }, []);

  const onPick = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onAnalyse = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-schedule", { method: "POST", body: fd });
      const data = (await res.json()) as ParseResult | { error: string };
      if (!res.ok && "error" in data) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data as ParseResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onAcceptIntoBuilder = () => {
    if (!result?.schedule) return;
    sessionStorage.setItem(
      "myFabEstimator.importedSchedule.v1",
      JSON.stringify(result.schedule)
    );
    router.push("/quotes/new?from=import");
  };

  return (
    <div>
      <PageHeader
        title="Import quote from drawing"
        description="Upload a CAD drawing with an equipment schedule. The AI extracts each line item, scores the quality, and either lets you continue into the quote builder or rejects with advice on what's missing."
      />

      {/* Pre-flight readiness */}
      {!result && readiness && !readiness.overall_ok && (
        <ReadinessPanel report={readiness} />
      )}

      {/* Upload box */}
      {!result && (
        <Card>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onPick(f);
            }}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragOver ? "border-accent bg-accent/5" : "border-border bg-soft"
            }`}
          >
            <div className="text-sm text-muted mb-3">
              Drag and drop a PDF here, or
            </div>
            <label className="inline-block">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
              <span className="inline-flex items-center rounded-md bg-accent text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent/90">
                Choose file
              </span>
            </label>
            {file && (
              <div className="mt-4 text-sm text-ink">
                {file.name}{" "}
                <span className="text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            )}
            <div className="text-xs text-muted mt-6">
              PDF only • max 20 MB • drawings with a structured equipment schedule work best
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-xs text-muted">
              {readinessLoading
                ? "Checking your account is ready…"
                : readiness?.overall_ok
                  ? "All systems ready — click Analyse to start."
                  : "Account not fully ready — see warnings above. You can still try, but errors are likely."}
            </div>
            <Button onClick={onAnalyse} disabled={!file || busy}>
              {busy ? "Analysing… (30–60 sec)" : "Analyse drawing"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad">
              {error}
            </div>
          )}
        </Card>
      )}

      {/* Result */}
      {result && (
        <ResultPanel
          result={result}
          onAccept={onAcceptIntoBuilder}
          onRetry={() => { setResult(null); setFile(null); }}
        />
      )}
    </div>
  );
}

function ResultPanel({
  result,
  onAccept,
  onRetry,
}: {
  result: ParseResult;
  onAccept: () => void;
  onRetry: () => void;
}) {
  const { schedule, assessment } = result;
  const acceptable = assessment.acceptable;
  const score = assessment.quality_score;

  // How many items had dimensions estimated visually from the plan vs read
  // from the schedule vs missing entirely?
  const estimatedCount = (schedule?.line_items ?? []).filter((l) =>
    l.is_bespoke_fabrication &&
    l.missing_fields.some((m) => m.includes("dimensions_estimated_from_plan") || m.includes("estimated"))
  ).length;
  const scheduledCount = (schedule?.line_items ?? []).filter((l) =>
    l.is_bespoke_fabrication &&
    l.suggested_spec?.length_mm &&
    !l.missing_fields.some((m) => m.includes("dimensions"))
  ).length;
  const missingDimsCount = (schedule?.line_items ?? []).filter((l) =>
    l.is_bespoke_fabrication &&
    !l.suggested_spec?.length_mm
  ).length;
  const bespokeTotal = (schedule?.line_items ?? []).filter((l) => l.is_bespoke_fabrication).length;

  return (
    <div className="space-y-6">
      {/* Header — overall result */}
      <Card>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs text-muted">Quality score</div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className={`text-5xl font-semibold ${acceptable ? "text-ok" : "text-bad"}`}>
                {score}%
              </div>
              <div className={`text-sm font-medium ${acceptable ? "text-ok" : "text-bad"}`}>
                {acceptable ? "Acceptable — ready to continue" : "Rejected — see advice below"}
              </div>
            </div>
            <div className="text-xs text-muted mt-3">
              Threshold for acceptance: 60%
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button onClick={onRetry} variant="secondary">Upload a different file</Button>
            {acceptable ? (
              <Button onClick={onAccept}>Open in quote builder →</Button>
            ) : score >= 50 && schedule && schedule.line_items.length > 0 ? (
              <Button onClick={onAccept} variant="secondary">
                Continue anyway with warnings →
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Metric label="Metadata" value={assessment.components.metadata_completeness} />
          <Metric label="Line items" value={assessment.components.line_item_completeness} />
          <Metric label="Bespoke specs" value={assessment.components.bespoke_spec_completeness} />
          <Metric
            label="Drawing key"
            value={assessment.components.drawing_key_present ? "Detected" : "Missing"}
            ok={assessment.components.drawing_key_present}
          />
        </div>
      </Card>

      {/* Rejection / advice */}
      {!acceptable && assessment.rejection_reasons.length > 0 && (
        <Card title="Why this drawing was rejected">
          <ul className="space-y-2 text-sm">
            {assessment.rejection_reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-bad mt-0.5">•</span>
                <span className="text-ink">{r}</span>
              </li>
            ))}
          </ul>
          {result.raw_error && (
            <details className="mt-4 pt-3 border-t border-border">
              <summary className="text-xs text-muted cursor-pointer">Show raw error details</summary>
              <pre className="mt-2 text-xs bg-soft p-3 rounded-md overflow-x-auto whitespace-pre-wrap text-bad">
                {result.raw_error}
              </pre>
            </details>
          )}
          {assessment.advice.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">How to fix</div>
              <ul className="space-y-2 text-sm">
                {assessment.advice.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">→</span>
                    <span className="text-ink">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Dimensions choice — shown when any items have estimated or missing dims */}
      {bespokeTotal > 0 && (estimatedCount > 0 || missingDimsCount > 0) && (
        <Card title="Dimensions — your call">
          <p className="text-sm text-muted mb-4">
            {bespokeTotal} bespoke fabrication item{bespokeTotal === 1 ? "" : "s"} on this
            drawing. Of those:
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm mb-5">
            <div className="rounded-md bg-ok/10 border border-ok/30 p-3">
              <div className="text-xs text-ok font-medium">From schedule</div>
              <div className="text-2xl font-semibold text-ink mt-1">{scheduledCount}</div>
              <div className="text-xs text-muted mt-1">Read directly from item description text.</div>
            </div>
            <div className="rounded-md bg-warn/10 border border-warn/30 p-3">
              <div className="text-xs text-warn font-medium">AI-estimated (±15–20%)</div>
              <div className="text-2xl font-semibold text-ink mt-1">{estimatedCount}</div>
              <div className="text-xs text-muted mt-1">Visual estimate from the scaled plan using a 900mm bench-height reference.</div>
            </div>
            <div className="rounded-md bg-bad/10 border border-bad/30 p-3">
              <div className="text-xs text-bad font-medium">No data → default</div>
              <div className="text-2xl font-semibold text-ink mt-1">{missingDimsCount}</div>
              <div className="text-xs text-muted mt-1">Will use product-type defaults (e.g. 1800×700×900 for a bench).</div>
            </div>
          </div>

          <div className="text-sm text-ink mb-3">How would you like to proceed?</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={onAccept}
              className="text-left rounded-lg border border-accent bg-accent/5 hover:bg-accent/10 p-4 transition-colors"
            >
              <div className="font-medium text-ink">Trust AI estimates and continue →</div>
              <div className="text-xs text-muted mt-1">
                Proceed into the quote builder with the AI&rsquo;s extracted and estimated
                dimensions. Each line item is editable — you can fix any size as you go.
                Fastest path; expect ±15–20% accuracy on the estimated items.
              </div>
            </button>
            <button
              onClick={onRetry}
              className="text-left rounded-lg border border-border bg-panel hover:bg-soft p-4 transition-colors"
            >
              <div className="font-medium text-ink">Revise the schedule first ↻</div>
              <div className="text-xs text-muted mt-1">
                Cancel this import. Update your CAD schedule to include explicit
                dimensions (e.g. <em>&ldquo;approx. 2000mm × 700mm × 900mm&rdquo;</em> in
                each item description), export a new PDF, then re-upload. Most accurate
                path; gives you 95%+ confidence per item.
              </div>
            </button>
          </div>
        </Card>
      )}

      {/* Warnings */}
      {assessment.warnings.length > 0 && (
        <Card title={`Warnings (${assessment.warnings.length})`}>
          <ul className="space-y-1 text-sm">
            {assessment.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-warn">
                <span className="mt-0.5">⚠</span>
                <span className="text-ink">{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Extracted metadata */}
      {schedule?.drawing_metadata && (
        <Card title="Drawing details extracted">
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <MetaRow label="Project" value={schedule.drawing_metadata.project_name} />
            <MetaRow label="Client" value={schedule.drawing_metadata.client_name} />
            <MetaRow label="Site" value={schedule.drawing_metadata.site_address} />
            <MetaRow label="Drawing no." value={schedule.drawing_metadata.drawing_number} />
            <MetaRow label="Revision" value={schedule.drawing_metadata.revision} />
            <MetaRow label="Scale" value={schedule.drawing_metadata.scale} />
            <MetaRow label="Drawn by" value={schedule.drawing_metadata.drawn_by} />
            <MetaRow label="Date" value={schedule.drawing_metadata.drawing_date} />
          </dl>
        </Card>
      )}

      {/* Line items */}
      {schedule && schedule.line_items.length > 0 && (
        <Card title={`Line items extracted (${schedule.line_items.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 pr-3">Item</th>
                  <th className="pb-2 pr-3">Area</th>
                  <th className="pb-2 pr-3">Qty</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2 pr-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {schedule.line_items.map((l, i) => (
                  <LineRow key={i} item={l} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReadinessPanel({ report }: { report: ReadinessReport }) {
  const failing = report.checks.filter((c) => !c.ok);
  return (
    <div className="rounded-lg border border-warn/40 bg-warn/5 p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-warn text-xl shrink-0">⚠</span>
        <div className="flex-1">
          <div className="font-semibold text-ink text-sm">
            Your account isn&rsquo;t fully ready for drawing import
          </div>
          <div className="text-xs text-muted mt-1 mb-3">
            {failing.length} of {report.checks.length} pre-flight checks failing. Fix these before
            uploading, otherwise the AI parser will fail or the engine won&rsquo;t be able to price the
            extracted line items.
          </div>
          <ul className="space-y-2">
            {report.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={c.ok ? "text-ok" : "text-bad"}>
                  {c.ok ? "✓" : "✗"}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-ink">{c.label}</span>
                  <span className="text-muted"> — {c.detail}</span>
                  {!c.ok && c.fix_link && c.fix_label && (
                    <Link href={c.fix_link} className="text-accent underline ml-2 text-xs">
                      {c.fix_label}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: number | string; ok?: boolean }) {
  return (
    <div className="rounded-md bg-soft p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${ok === false ? "text-bad" : "text-ink"}`}>
        {typeof value === "number" ? `${value}%` : value}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="contents">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink col-span-1 md:col-span-2">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

function LineRow({ item }: { item: ParsedLineItem }) {
  const tag =
    item.is_bespoke_fabrication ? "Bespoke" :
    item.is_bought_in_equipment ? "Bought-in" :
    item.is_client_supplied ? "By client" :
    item.is_future_item ? "Future" : "—";
  const tagColor =
    item.is_bespoke_fabrication ? "bg-accent/10 text-accent" :
    item.is_bought_in_equipment ? "bg-soft text-ink" :
    item.is_client_supplied ? "bg-warn/10 text-warn" :
    item.is_future_item ? "bg-warn/10 text-warn" : "bg-soft text-muted";

  const dimsEstimated = item.missing_fields.some((m) =>
    m.toLowerCase().includes("estimated")
  );
  const dimsMissing = item.is_bespoke_fabrication && !item.suggested_spec?.length_mm;
  const dimsLength = item.suggested_spec?.length_mm;
  const dimsDepth = item.suggested_spec?.depth_mm;
  const dimsHeight = item.suggested_spec?.height_mm;

  return (
    <tr className="border-t border-border align-top">
      <td className="py-2 pr-3 font-medium">{item.item_no}</td>
      <td className="py-2 pr-3 text-muted text-[11px]">{item.area_label?.replace(/^AREA \d+ — /, "") ?? "—"}</td>
      <td className="py-2 pr-3">{item.quantity}</td>
      <td className="py-2 pr-3">
        <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tagColor}`}>
          {tag}
        </div>
        <div className="text-[10px] text-muted mt-1">{item.inferred_product_type}</div>
      </td>
      <td className="py-2 pr-3 max-w-md">
        <div className="text-ink">{item.description}</div>
        {item.is_bespoke_fabrication && (dimsLength || dimsDepth) && (
          <div className="text-[11px] mt-1 flex items-center gap-1.5">
            <span className={dimsEstimated ? "text-warn" : "text-ok"}>
              {dimsEstimated ? "📐 estimated" : "✓ from schedule"}
            </span>
            <span className="text-muted">
              {dimsLength ?? "?"}{dimsDepth ? " × " + dimsDepth : ""}{dimsHeight ? " × " + dimsHeight : ""} mm
            </span>
          </div>
        )}
        {dimsMissing && (
          <div className="text-[11px] text-bad mt-1">
            ⚠ no dimensions — defaults will apply, please verify
          </div>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        <span className={`tabular-nums font-medium ${
          item.confidence >= 80 ? "text-ok" :
          item.confidence >= 60 ? "text-warn" : "text-bad"
        }`}>
          {item.confidence}%
        </span>
      </td>
    </tr>
  );
}
