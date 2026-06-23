// lib/api/data-inspect.ts — the live data-inspection contract mapping (ADR-0002 D6).
//
// Two REAL endpoints on research-workbench (:8105), the only service that serves
// actual data (artifact-catalog/data-catalog carry metadata only — MAPPING.md
// T-3). Both translate the snake_case Pydantic wire shapes into lib/types:
//   • /api/research/artifacts/{id}/preview  → first ≤limit rows (a SAMPLE)
//   • /api/research/eda/{id}/summary        → stats + histograms over ALL rows
// See lib/api/MAPPING.md for the per-getter table.

import { rwbGet, encId } from "@/lib/api/http";
import type {
  LiveArtifactPreview,
  LiveColumn,
  LiveColumnStat,
  LiveEdaSummary,
  LiveHistogram,
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
