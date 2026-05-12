// Brand logo for My Fab Estimator.
//
// Three variants:
//   <LogoIcon />          — just the table+badge glyph, square (sidebar, favicon-style)
//   <LogoFull />          — the full horizontal lockup with wordmark + tagline (auth pages)
//   <LogoWithText />      — icon + compact text wordmark (for tight headers)
//
// Files served from /public:
//   /logo-icon.svg  — icon only
//   /logo-full.svg  — full horizontal lockup including text and tagline

interface BaseProps {
  className?: string;
}

export function LogoIcon({ className = "h-10 w-10" }: BaseProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-icon.svg" alt="My Fab Estimator" className={className} />
  );
}

export function LogoFull({ className = "h-32" }: BaseProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-full.svg" alt="My Fab Estimator — Quote faster. Protect your margin." className={className} />
  );
}

export function LogoWithText({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const dims = {
    sm: { icon: "h-8 w-8", main: "text-sm", sub: "text-xs", tagline: "text-[10px]" },
    md: { icon: "h-12 w-12", main: "text-lg", sub: "text-base", tagline: "text-xs" },
    lg: { icon: "h-16 w-16", main: "text-2xl", sub: "text-xl", tagline: "text-sm" },
  }[size];

  return (
    <div className="flex items-center gap-3">
      <LogoIcon className={dims.icon} />
      <div className="leading-tight">
        <div className={`${dims.main} font-extrabold text-navy tracking-tight`}>
          My Fab
        </div>
        <div className={`${dims.sub} font-medium text-accent -mt-0.5`}>
          Estimator
        </div>
        {showTagline && (
          <div className={`${dims.tagline} text-muted mt-1.5 uppercase tracking-wider font-semibold`}>
            Quote faster. Protect your margin.
          </div>
        )}
      </div>
    </div>
  );
}
