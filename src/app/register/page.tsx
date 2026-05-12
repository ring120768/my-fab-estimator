"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";
import { LogoFull } from "@/components/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding/company");
      router.refresh();
    } else {
      setInfo("Account created. Check your email for the confirmation link, then sign in.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-bg to-soft">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: hero */}
          <div className="space-y-8">
            <LogoFull className="h-32 w-auto" />

            <h1 className="text-3xl lg:text-4xl font-semibold text-navy leading-tight tracking-tight">
              Start quoting properly in under five minutes.
            </h1>

            <p className="text-base text-steel leading-relaxed">
              Register, name your company, and you&rsquo;ll be in. We seed your
              costing matrix with sensible UK fabricator defaults so you can
              produce your first quote straight away — then tune the rates to
              your business.
            </p>

            <div className="space-y-4">
              <Step n={1} title="Create your account" body="Just email and password. No card, no commitment." />
              <Step n={2} title="Name your company" body="One-line setup. We seed your library with worktops, sinks, benches, doors, drawers, splashbacks, shelves and more." />
              <Step n={3} title="Build your first quote" body="Add line items, see live totals, save the quote with a costing snapshot for audit." />
            </div>

            <div className="rounded-lg border border-border bg-panel/50 p-4 text-sm text-steel">
              <strong className="text-ink">Tip:</strong> Pick a quote you produced
              recently and rebuild it here. Compare the numbers. Variances tell you
              where to tune the engine — that&rsquo;s how we calibrate to your
              business.
            </div>
          </div>

          {/* Right: register form */}
          <div className="lg:max-w-md lg:ml-auto w-full">
            <Card title="Create your account">
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  hint="At least 8 characters."
                />
                {error && (
                  <div className="rounded-md bg-bad/10 border border-bad/30 p-2 text-sm text-bad">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="rounded-md bg-ok/10 border border-ok/30 p-2 text-sm text-ok">
                    {info}
                  </div>
                )}
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
              <div className="text-sm text-muted mt-5 pt-5 border-t border-border text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-accent font-medium hover:underline">
                  Sign in →
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

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold text-sm flex items-center justify-center">
        {n}
      </div>
      <div>
        <div className="font-medium text-ink text-sm">{title}</div>
        <div className="text-xs text-steel mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
