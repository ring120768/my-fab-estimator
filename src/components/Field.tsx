// Small reusable inputs. No form library yet — keep it boring.

export function TextField({
  label,
  hint,
  ...props
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      <input
        {...props}
        className="block w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export function NumberField(
  props: { label: string; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
) {
  return <TextField {...props} type="number" />;
}

export function SelectField({
  label,
  options,
  hint,
  ...props
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  hint?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      <select
        {...props}
        className="block w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}
