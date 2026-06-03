import type { HostedDataset } from "@/lib/types";

/**
 * Hosted datasets a logged-out user can preview and a builder can pick.
 * Honesty-corrected against the real catalog: only real schemas
 * (databento.silver.ohlcv-{1s,1m,1h,1d}); no 5m/tick grains.
 * `nasdaq-large-cap` is a universe over DBEQ equities at the 1d grain.
 */

const ohlcvFields = [
  { name: "ts_event", type: "timestamp", note: "event time, UTC" },
  { name: "symbol", type: "string" },
  { name: "open", type: "decimal" },
  { name: "high", type: "decimal" },
  { name: "low", type: "decimal" },
  { name: "close", type: "decimal" },
  { name: "volume", type: "int64" },
];

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
  },
];
