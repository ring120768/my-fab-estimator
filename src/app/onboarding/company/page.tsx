"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCompanyForUser, getCurrentCompany } from "@/lib/supabase/data-access";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user already has a company, skip.
  useEffect(() => {
    (async () => {
      const ctx = await getCurrentCompany(supabase);
      if (ctx) router.replace("/");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await createCompanyForUser(supabase, name.trim() || "My Fabrication Co");
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-ink">Welcome to My Fab Estimator</div>
          <div className="text-xs text-muted mt-1">
            One quick step before we get going.
          </div>
        </div>
        <Card title="Create your company">
          <p className="text-sm text-muted mb-4">
            We&apos;ll seed your costing matrix with sensible UK fabricator defaults
            (304 sheet at £80/m², £45/hr fabrication, etc.). You can edit any of
            them on the Costing Matrix page once you&apos;re in.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Company name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Stainless Ltd"
            />
            {error && (
              <div className="rounded-md bg-bad/10 border border-bad/30 p-2 text-sm text-bad">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Setting up…" : "Create company & continue"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
