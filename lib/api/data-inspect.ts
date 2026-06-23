// lib/api/data-inspect.ts — the live data-inspection contract mapping (ADR-0002 D6).
//
// Two REAL endpoints on research-workbench (:8105), the only service that serves
// actual data (artifact-catalog/data-catalog carry metadata only — MAPPING.md
// T-3). Both translate the snake_case Pydantic wire shapes into lib/types:
//   • /api/research/artifacts/{id}/preview  → first ≤limit rows (a SAMPLE)
//   • /api/research/eda/{id}/summary        → stats + histograms over ALL rows
// See lib/api/MAPPING.md for the per-getter table.

import { rwbGet, rwbPost, encId } from "@/lib/api/http";
import type {
  ArtifactSeries,
  LiveArtifactPreview,
  LiveColumn,
  LiveColumnStat,
  LiveEdaSummary,
  LiveHistogram,
  SeriesContract,
  SeriesGrain,
} from "@/lib/types";

// ── upstream wire shapes (research-workbench) ────────────────────────────────

interface PreviewWire {
  status: string;
  source_field?: string;
  source_path?: string;
  format?: string;
  columns: { name: string; dtype: string }[];
  rows: (string | number | boolean | null)[][];
  total_rows: number;
  limit: number | null;
  truncated: boolean;
}

interface ColumnStatWire {
  name: string;
  dtype: string;
  count: number;
  null_count: number;
  null_pct: number;
  n_distinct: number;
  mean: number | null;
  std: number | null;
  min_val: number | string | null;
  max_val: number | string | null;
  p01: number | null;
  p05: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  p99: number | null;
  nan_count: number;
  inf_count: number;
}

interface HistogramWire {
  name: string;
  is_numeric: boolean;
  bins: { bin_start: number; bin_end: number; count: number }[] | null;
  categories: { value: string; count: number }[] | null;
}

interface EdaSummaryWire {
  source_row_count: number;
  sample_row_count: number;
  generated_at: string;
  column_stats: ColumnStatWire[];
  histograms: HistogramWire[];
}

// ── mappers ──────────────────────────────────────────────────────────────────

const toColumn = (c: { name: string; dtype: string }): LiveColumn => ({
  name: c.name,
  dtype: c.dtype,
});

function previewToModel(p: PreviewWire): LiveArtifactPreview {
  return {
    status: p.status,
    columns: p.columns.map(toColumn),
    rows: p.rows,
    totalRows: p.total_rows,
    truncated: p.truncated,
    sourceField: p.source_field,
    format: p.format,
  };
}

const statToModel = (s: ColumnStatWire): LiveColumnStat => ({
  name: s.name,
  dtype: s.dtype,
  count: s.count,
  nullCount: s.null_count,
  nullPct: s.null_pct,
  nDistinct: s.n_distinct,
  mean: s.mean,
  std: s.std,
  minVal: s.min_val,
  maxVal: s.max_val,
  p01: s.p01,
  p05: s.p05,
  p25: s.p25,
  p50: s.p50,
  p75: s.p75,
  p95: s.p95,
  p99: s.p99,
  nanCount: s.nan_count,
  infCount: s.inf_count,
});

const histToModel = (h: HistogramWire): LiveHistogram => ({
  name: h.name,
  isNumeric: h.is_numeric,
  bins: h.bins
    ? h.bins.map((b) => ({ binStart: b.bin_start, binEnd: b.bin_end, count: b.count }))
    : null,
  categories: h.categories ?? null,
});

function edaToModel(e: EdaSummaryWire): LiveEdaSummary {
  return {
    sourceRowCount: e.source_row_count,
    sampleRowCount: e.sample_row_count,
    generatedAt: e.generated_at,
    columnStats: e.column_stats.map(statToModel),
    histograms: e.histograms.map(histToModel),
  };
}

// ── getters (server-only; called by the BFF route handlers) ──────────────────

/** First ≤`limit` rows of an artifact's output (REAL, a labeled sample). The
 *  preview endpoint caps at 500 and ignores offset — there is no row paging. */
export async function getArtifactPreview(
  id: string,
  limit = 500,
): Promise<LiveArtifactPreview | undefined> {
  const lim = Math.min(Math.max(1, limit), 500);
  const p = await rwbGet<PreviewWire | undefined>(
    `/api/research/artifacts/${encId(id)}/preview?limit=${lim}`,
  );
  return p ? previewToModel(p) : undefined;
}

/** Per-column stats + histograms over the FULL table (a pre-computed sidecar).
 *  Undefined if the artifact was never summarized (no EDA sidecar on disk). */
export async function getArtifactEda(id: string): Promise<LiveEdaSummary | undefined> {
  const e = await rwbGet<EdaSummaryWire | undefined>(
    `/api/research/eda/${encId(id)}/summary`,
  );
  return e ? edaToModel(e) : undefined;
}

// ── Plot tab (the :8105 query endpoint, DuckDB over the full table) ───────────

const queryPath = (id: string) => `/api/research/eda/${encId(id)}/query`;
const n = (v: unknown): number => (v == null ? 0 : Number(v));
const nOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

interface QueryRowsWire {
  rows: Record<string, unknown>[] | null;
  result_truncated?: boolean;
}

/** The contracts in an OHLCV artifact (canonical_id × symbol) with their row
 *  count and date span — one grouped query, drives the Plot tab's picker. */
export async function getArtifactContracts(id: string): Promise<SeriesContract[]> {
  const res = await rwbPost<QueryRowsWire>(queryPath(id), {
    group_by: ["canonical_id", "symbol"],
    aggregations: [
      { column: "session_id", fn: "min", alias: "first" },
      { column: "session_id", fn: "max", alias: "last" },
      { column: "*", fn: "count", alias: "rows" },
    ],
    order_by: [["last", "desc"]],
    limit: 5000,
  });
  return (res?.rows ?? []).map((r) => ({
    canonicalId: String(r.canonical_id),
    symbol: r.symbol == null ? null : String(r.symbol),
    rows: n(r.rows),
    first: String(r.first),
    last: String(r.last),
  }));
}

/** A real OHLCV series for one contract over [from, to] (session dates).
 *  `minute` selects raw per-bar OHLC; `daily` aggregates per session (no true
 *  open — there is no first() aggregation, so `open` comes back null). */
export async function getArtifactSeries(
  id: string,
  opts: { contract: string; from: string; to: string; grain: SeriesGrain },
): Promise<ArtifactSeries> {
  const filters = [
    { column: "canonical_id", op: "=", value: opts.contract },
    { column: "session_id", op: "between", value: [opts.from, opts.to] },
  ];
  const body =
    opts.grain === "minute"
      ? {
          filters,
          select_columns: ["ts_event", "open", "high", "low", "close", "volume"],
          order_by: [["ts_event", "asc"]],
          limit: 20000,
        }
      : {
          filters,
          group_by: ["session_id"],
          aggregations: [
            { column: "high", fn: "max", alias: "high" },
            { column: "low", fn: "min", alias: "low" },
            { column: "close", fn: "mean", alias: "close" },
            { column: "volume", fn: "sum", alias: "volume" },
          ],
          order_by: [["session_id", "asc"]],
          limit: 5000,
        };
  // The query endpoint's `result_truncated` compares the PRE-aggregation row
  // count to the limit, so it's wrong for GROUP BY (daily). Truth = did the
  // OUTPUT hit the cap we asked for.
  const cap = opts.grain === "minute" ? 20000 : 5000;
  const res = await rwbPost<QueryRowsWire>(queryPath(id), body);
  const rows = res?.rows ?? [];
  const bars =
    opts.grain === "minute"
      ? rows.map((r) => ({
          t: String(r.ts_event),
          open: nOrNull(r.open),
          high: n(r.high),
          low: n(r.low),
          close: n(r.close),
          volume: n(r.volume),
        }))
      : rows.map((r) => ({
          t: String(r.session_id),
          open: null,
          high: n(r.high),
          low: n(r.low),
          close: n(r.close),
          volume: n(r.volume),
        }));
  return { grain: opts.grain, bars, truncated: bars.length >= cap };
}
