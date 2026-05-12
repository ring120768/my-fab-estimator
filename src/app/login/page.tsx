"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";
import { LogoFull } from "@/components/Logo";
import { fmtMoney } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-bg to-soft">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: hero */}
          <div className="space-y-8">
            <LogoFull className="h-32 w-auto" />

            <h1 className="text-3xl lg:text-4xl font-semibold text-navy leading-tight tracking-tight">
              Built for stainless steel fabricators who can&rsquo;t afford guesswork.
            </h1>

            <p className="text-base text-steel leading-relaxed">
              Replace your 8-tab quote workbook with one structured tool. Live cost
              breakdowns, built-in feature catalogue, customer-ready quote text — and
              an audit trail on every job.
            </p>

            <ul className="space-y-3 text-sm text-ink">
              <FeatureBullet>Multi-line quotes with per-line cost breakdown</FeatureBullet>
              <FeatureBullet>Live margin protection — missing rates surface as errors, not guesses</FeatureBullet>
              <FeatureBullet>Auto-generated customer descriptions in your house grammar</FeatureBullet>
              <FeatureBullet>Costing snapshot saved with every quote — full audit trail</FeatureBullet>
              <FeatureBullet>Brushed, burnished or mirror — labour scaled automatically</FeatureBullet>
            </ul>

            <SamplePreview />
          </div>

          {/* Right: sign-in card */}
          <div className="lg:max-w-md lg:ml-auto w-full">
            <Card title="Sign in to your account">
              <form onSubmit={handleSubmit} className="space-y-4">
                <TextField
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && (
                  <div className="rounded-md bg-bad/10 border border-bad/30 p-2 text-sm text-bad">
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <div className="text-sm text-muted mt-5 pt-5 border-t border-border text-center">
                New here?{" "}
                <Link href="/register" className="text-accent font-medium hover:underline">
                  Create your account →
                </Link>
              </div>
            </Card>
            <div className="text-xs text-muted mt-4 text-center">
              Built by fabricators, for fabricators.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10">
        <svg className="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

// Decorative — illustrates what the app produces.
function SamplePreview() {
  return (
    <div className="rounded-lg border border-border bg-panel shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-soft flex items-center justify-between">
        <div className="text-xs font-medium text-muted">Sample line item</div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
          <span className="w-1.5 h-1.5 rounded-full bg-ok"></span>
          Margin above minimum
        </span>
      </div>
      <div className="px-4 py-3 space-y-3 text-sm">
        <div className="text-ink">
          <span className="text-xs text-muted mr-2">1.010</span>
          Stainless steel wall bench 2000mm × 700mm × 900mm complete with
          50mm upstand to rear and fixed base shelf.
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <Row label="Material" value={284} />
          <Row label="Labour (3.7 hrs)" value={166} />
          <Row label="Consumables" value={14} />
          <Row label="Build cost" value={464} bold />
          <Row label="Margin (30%)" value={199} muted />
          <Row label="Sell ex VAT" value={663} bold accent />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, accent }: { label: string; value: number; bold?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <>
      <span className={muted ? "text-muted" : "text-ink"}>{label}</span>
      <span className={`text-right tabular-nums ${bold ? "font-semibold" : ""} ${accent ? "text-accent" : muted ? "text-muted" : "text-ink"}`}>
        {fmtMoney(value)}
      </span>
    </>
  );
}
