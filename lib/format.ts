/**
 * Shared display formatting for data surfaces (tables, stats, cells).
 * Magnitude-bucketed number formatting + null-safe cell rendering, so every
 * data table reads consistently. Mirrors what a real EDA sidecar would format.
 */

export function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 1) return v.toFixed(3);
  if (v === 0) return "0";
  return v.toPrecision(3);
}

/** A single cell value, dtype-aware. Nulls → em-dash; numbers via fmtNumber. */
export function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return fmtNumber(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

/** Is this declared dtype numeric (→ right-align, tabular-nums)? */
export function isNumericType(type: string | undefined): boolean {
  return /\b(int|float|decimal|double|number|numeric)\w*/i.test(type ?? "");
}

/** Compact row-count: 3_812_400 → "3.81M". */
export function fmtCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
