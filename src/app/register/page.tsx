"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";

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
      // Auto-confirmed (email confirmation off) — go straight to onboarding.
      router.push("/onboarding/company");
      router.refresh();
    } else {
      setInfo("Account created. Check your email for the confirmation link, then sign in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-ink">My Fab Estimator</div>
          <div className="text-xs text-muted mt-1">Stainless steel costing</div>
        </div>
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
          <div className="text-xs text-muted mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
