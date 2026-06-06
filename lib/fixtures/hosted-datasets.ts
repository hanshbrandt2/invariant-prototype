import type { ColumnHistogram, ColumnStat, HostedDataset, SchemaField } from "@/lib/types";

/**
 * Hosted datasets a logged-out user can preview and a builder can pick.
 * Honesty-corrected against the real catalog: only real schemas
 * (databento.silver.ohlcv-{1s,1m,1h,1d}); no 5m/tick grains.
 * `nasdaq-large-cap` is a universe over DBEQ equities at the 1d grain.
 */

const ohlcvFields: SchemaField[] = [
  { name: "ts_event", type: "timestamp", role: "time", nullable: false, note: "event time, UTC" },
  { name: "symbol", type: "string", role: "key", nullable: false },
  { name: "open", type: "decimal", role: "value", nullable: false },
  { name: "high", type: "decimal", role: "value", nullable: false },
  { name: "low", type: "decimal", role: "value", nullable: false },
  { name: "close", type: "decimal", role: "value", nullable: false },
  { name: "volume", type: "int64", role: "value", nullable: true, note: "missing on some halts" },
];

/** A small, self-consistent OHLCV SAMPLE — deterministic (no Math.random),
 *  low<=open,close<=high, a couple of null volumes. Clearly a sample, never
 *  the full table (the row count is shown as `sample · N of M`). */
function mkSampleRows(sym: string, base: number, dp: number, grain: "1m" | "1d", n = 12): Record<string, unknown>[] {
  const r = (x: number) => +x.toFixed(dp);
  const ts = (i: number) =>
    grain === "1m"
      ? `2024-01-02T09:${String(30 + i).padStart(2, "0")}:00Z`
      : `2024-01-${String(2 + i).padStart(2, "0")}`;
  const rows: Record<string, unknown>[] = [];
  let close = base;
  for (let i = 0; i < n; i++) {
    const open = close;
    close = open + Math.sin(i * 0.7) * base * 0.004 + Math.cos(i * 1.9) * base * 0.0015;
    const high = Math.max(open, close) * (1 + 0.0012 + 0.0008 * Math.abs(Math.sin(i)));
    const low = Math.min(open, close) * (1 - 0.0012 - 0.0008 * Math.abs(Math.cos(i)));
    rows.push({
      ts_event: ts(i),
      symbol: sym,
      open: r(open),
      high: r(high),
      low: r(low),
      close: r(close),
      volume: i === 4 || i === 9 ? null : 1200 + ((i * 137) % 4200),
    });
  }
  return rows;
}

/** Pre-computed per-column stats snapshot (authored constants, internally
 *  consistent: min<=p01<=p50<=p99<=max). A real EDA sidecar ships this JSON. */
function mkColumnStats(base: number, dp: number, rows: number, missingPct: number, sym: string, coverage: { start: string; end: string }): ColumnStat[] {
  const r = (x: number) => +x.toFixed(dp);
  const price = (name: string, lo: number, hi: number, m: number): ColumnStat => ({
    name, type: "decimal", nullPct: 0, distinct: Math.round(rows * 0.34),
    mean: r(base * m), std: r(base * 0.041),
    p01: r(base * (lo + 0.06)), p50: r(base * m), p99: r(base * (hi - 0.04)),
    min: r(base * lo), max: r(base * hi),
  });
  return [
    { name: "ts_event", type: "timestamp", nullPct: 0, distinct: rows, min: coverage.start, max: coverage.end },
    { name: "symbol", type: "string", nullPct: 0, distinct: 1, min: sym, max: sym },
    price("open", 0.85, 1.15, 1.0),
    price("high", 0.86, 1.17, 1.001),
    price("low", 0.83, 1.14, 0.999),
    price("close", 0.85, 1.15, 1.0),
    { name: "volume", type: "int64", nullPct: missingPct, distinct: Math.round(rows * 0.6), mean: 2410, std: 1180, p01: 180, p50: 2280, p99: 6100, min: 0, max: 8240 },
  ];
}

function mkBins(min: number, max: number, counts: number[], dp: number): ColumnHistogram["bins"] {
  const w = (max - min) / counts.length;
  return counts.map((c, i) => ({ start: +(min + i * w).toFixed(dp), end: +(min + (i + 1) * w).toFixed(dp), count: c }));
}

/** Pre-binned distributions for the numeric columns (price ≈ bell, volume skewed). */
function mkHistograms(base: number, dp: number): ColumnHistogram[] {
  const bell = [120, 380, 920, 1850, 2600, 2100, 1200, 520, 160];
  const skew = [3200, 2400, 1500, 900, 540, 300, 160, 80, 30];
  const price = (column: string): ColumnHistogram => ({ column, bins: mkBins(base * 0.85, base * 1.15, bell, dp) });
  return [price("open"), price("high"), price("low"), price("close"), { column: "volume", bins: mkBins(0, 8200, skew, 0) }];
}

// compact preview series (the overview chart) — real-ish levels
const crude = [78.2, 77.1, 75.8, 74.3, 73.9, 75.6, 77.8, 79.1, 80.4, 81.2, 80.1, 78.6, 77.2, 76.4, 78.9, 81.3, 82.7, 84.1, 83.2, 81.9, 80.3, 79.1, 80.6, 82.2];
const gas = [2.51, 2.43, 2.18, 2.02, 1.91, 1.86, 2.04, 2.27, 2.39, 2.21, 2.08, 1.98, 2.31, 2.66, 2.84, 2.72, 2.59, 2.41, 2.33, 2.48, 2.71, 2.93, 3.12, 2.88];
const nasdaq = [142.3, 144.1, 143.2, 146.8, 149.2, 151.6, 150.1, 153.4, 156.9, 159.2, 157.8, 161.3, 164.7, 162.9, 166.2, 169.8, 168.1, 171.4, 174.9, 173.2, 176.8, 179.1, 177.6, 181.3];
const eurusd = [1.094, 1.091, 1.088, 1.085, 1.082, 1.079, 1.083, 1.087, 1.09, 1.093, 1.089, 1.086, 1.082, 1.078, 1.081, 1.085, 1.088, 1.092, 1.096, 1.099, 1.095, 1.091, 1.087, 1.084];

const toSeries = (arr: number[]) =>
  arr.map((v, i) => ({ t: String(i + 1).padStart(2, "0"), v }));

export const hostedDatasets: HostedDataset[] = [
  {
    id: "crude_oil_1m",
    name: "WTI Crude Oil",
    schema: "databento.silver.ohlcv-1m",
    assetClass: "energy",
    blurb: "NYMEX light sweet crude (CL), one-minute bars.",
    rows: 3_812_400,
    cols: 12,
    coverage: { start: "2024-01-02", end: "2024-12-31" },
    missingPct: 0.4,
    preview: toSeries(crude),
    schemaFields: ohlcvFields,
    sampleRows: mkSampleRows("CL", 78.2, 2, "1m"),
    columnStats: mkColumnStats(78.2, 2, 3_812_400, 0.4, "CL", { start: "2024-01-02", end: "2024-12-31" }),
    histograms: mkHistograms(78.2, 2),
  },
  {
    id: "nasdaq-large-cap",
    name: "Nasdaq large-cap",
    schema: "databento.silver.ohlcv-1d",
    assetClass: "equities",
    blurb: "A universe over DBEQ large-cap US equities, daily bars.",
    rows: 1_184_900,
    cols: 8,
    coverage: { start: "2014-01-02", end: "2024-12-31" },
    missingPct: 0.1,
    preview: toSeries(nasdaq),
    schemaFields: ohlcvFields,
    sampleRows: mkSampleRows("AAPL", 142.3, 2, "1d"),
    columnStats: mkColumnStats(142.3, 2, 1_184_900, 0.1, "AAPL", { start: "2014-01-02", end: "2024-12-31" }),
    histograms: mkHistograms(142.3, 2),
  },
  {
    id: "ng_henry_hub_1m",
    name: "Henry Hub Natural Gas",
    schema: "databento.silver.ohlcv-1m",
    assetClass: "energy",
    blurb: "NYMEX Henry Hub natural gas (NG), one-minute bars.",
    rows: 2_106_800,
    cols: 12,
    coverage: { start: "2024-01-02", end: "2024-12-31" },
    missingPct: 0.6,
    preview: toSeries(gas),
    schemaFields: ohlcvFields,
    sampleRows: mkSampleRows("NG", 2.51, 3, "1m"),
    columnStats: mkColumnStats(2.51, 3, 2_106_800, 0.6, "NG", { start: "2024-01-02", end: "2024-12-31" }),
    histograms: mkHistograms(2.51, 3),
  },
  {
    id: "fx_majors_1m",
    name: "FX majors",
    schema: "databento.silver.ohlcv-1m",
    assetClass: "fx",
    blurb: "CME FX majors (6E, 6B, 6J, 6A, 6C, 6N, 6S), one-minute bars.",
    rows: 5_402_100,
    cols: 12,
    coverage: { start: "2024-01-02", end: "2024-12-31" },
    missingPct: 0.2,
    preview: toSeries(eurusd),
    schemaFields: ohlcvFields,
    sampleRows: mkSampleRows("6E", 1.094, 4, "1m"),
    columnStats: mkColumnStats(1.094, 4, 5_402_100, 0.2, "6E", { start: "2024-01-02", end: "2024-12-31" }),
    histograms: mkHistograms(1.094, 4),
  },
];
