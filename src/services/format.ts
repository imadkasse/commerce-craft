/** Pure UI formatting helpers. No imports, no side effects. */

export function formatDate(
  input: string | number | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(input));
}

export function formatDateTime(
  input: string | number | Date,
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}

export function formatCurrency(
  value: number | string,
  currency = "USD",
  locale = "en-US",
): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

export function formatDzd(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return "0 DZD";
  return amount.toLocaleString("en-US").replace(/,/g, " ") + " DZD";
}
