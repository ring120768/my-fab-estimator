"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoWithText } from "@/components/Logo";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/costing-matrix", label: "Costing Matrix" },
  { href: "/quotes/new", label: "New Quote" },
  { href: "/quotes/import", label: "Import from drawing" },
  { href: "/quotes", label: "Quotes" },
  { href: "/estimates/new", label: "New Estimate (legacy)" },
  { href: "/estimates", label: "Estimates (legacy)" },
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from("company_users")
          .select("companies(name)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        const c = (data?.companies as unknown as { name: string } | null);
        setCompanyName(c?.name ?? null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render sidebar on auth/onboarding pages.
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname?.startsWith("/onboarding")
  ) {
    return null;
  }

  return (
    <aside className="no-print w-60 shrink-0 border-r border-border bg-panel min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <LogoWithText size="sm" />
        {companyName && (
          <div className="text-xs text-muted mt-3 truncate">{companyName}</div>
        )}
      </div>
      <nav className="p-3 space-y-1 flex-1">
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-soft text-ink font-medium"
                  : "text-muted hover:text-ink hover:bg-soft"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        {email && (
          <div className="text-xs text-muted mb-2 truncate" title={email}>
            {email}
          </div>
        )}
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="w-full text-left text-xs text-muted hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
