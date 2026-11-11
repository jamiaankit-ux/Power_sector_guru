export const inr = (paise: number) =>
  paise === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function duration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const hours = (sec: number) => (sec / 3600).toFixed(sec < 36000 ? 1 : 0);

export const dayKey = (d = new Date()) => {
  // Use IST so "today" matches learners in India.
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 10);
};

export const parseList = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);

export const intervalLabel = (i: string) => ({ MONTH: "month", QUARTER: "quarter", YEAR: "year" }[i] ?? i.toLowerCase());
