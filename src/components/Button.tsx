import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "bg-panel border border-border text-ink hover:bg-soft",
  ghost: "text-ink hover:bg-soft",
  danger: "bg-bad text-white hover:bg-bad/90",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
    />
  );
});
