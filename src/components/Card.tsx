export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-panel border border-border rounded-lg shadow-sm ${className}`}>
      {title && (
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatusChip({
  status,
}: {
  status: "complete" | "review" | "missing" | "optional";
}) {
  const map = {
    complete: "bg-ok/10 text-ok",
    review: "bg-warn/10 text-warn",
    missing: "bg-bad/10 text-bad",
    optional: "bg-soft text-muted",
  };
  const label = {
    complete: "Complete",
    review: "Needs review",
    missing: "Missing",
    optional: "Optional",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}
