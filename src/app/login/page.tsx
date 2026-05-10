"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-ink">My Fab Estimator</div>
          <div className="text-xs text-muted mt-1">Stainless steel costing</div>
        </div>
        <Card title="Sign in">
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
          <div className="text-xs text-muted mt-4 text-center">
            No account?{" "}
            <Link href="/register" className="text-accent underline">
              Register
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
