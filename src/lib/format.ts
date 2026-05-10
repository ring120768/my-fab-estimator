// Currency / number formatting. Single source of truth so the UI doesn't drift.

export const fmtMoney = (n: number, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const fmtPct = (n: number) => `${n}%`;

export const fmtMm = (n: number) => `${n} mm`;
