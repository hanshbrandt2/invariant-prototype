"use client";

import { useState } from "react";
import type { ColumnStat, LineageSubgraph, Node, SchemaField } from "@/lib/types";
import { inputsOf, nodeById, opSeries } from "@/components/workspace/inspector/face-types";
import { fmtCount, fmtNumber } from "@/lib/format";

/**
 * The data-inspection block — every derived artifact opens on its real output:
 * the columns it produces, a labelled point-in-time sample, and per-column
 * stats. Tables-first (no chart, no sparkline) — the honest shape of the data,
 * derived deterministically from the producing operator so it's consistent with
 * the same illustrative series the rest of the inspector reads.
 *
 * This is the derived-artifact analogue of DatasetOverview, which already gives
 * hosted datasets schema/sample/stats. Together: nothing opens code-first.
 */

// a representative full-series row count per cadence — derived artifacts inherit
// the source dataset's shape; clearly labelled "representative" at the table.
const ROWS_BY_FREQ: Record<string, number> = { "1m": 3_812_400, "5m": 762_480, "1d": 2_516 };
const COVERAGE = { start: "2024-01-02", end: "2024-12-31" };

function inferFreq(name: string): string {
  if (/(_1d|daily|_10y|momentum)/i.test(name)) return "1d";
  if (/5m/i.test(name)) return "5m";
  return "1m";
}

/** A small intraday (or daily) point-in-time index for the sample rows. */
function tsSeq(freq: string, n: number): string[] {
  if (freq === "1d") return Array.from({ length: n }, (_, i) => `2024-06-${String(3 + i).padStart(2, "0")}`);
  const step = freq === "5m" ? 5 : 1;
  const base = 14 * 60 + 30; // 14:30 UTC
  return Array.from({ length: n }, (_, i) => {
    const m = base + i * step;
    return `2024-06-03T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00Z`;
  });
}

function statOf(name: string, series: number[]): ColumnStat {
  const k = series.length;
  const mean = series.reduce((a, b) => a + b, 0) / k;
  const std = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / k);
  const sorted = [...series].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(k - 1, Math.floor(p * k))];
  return { name, type: "float64", nullPct: 0, distinct: k, mean, std, p01: q(0.01), p50: q(0.5), p99: q(0.99), min: sorted[0], max: sorted[k - 1] };
}

export interface ArtifactDataView {
  shape: { rows: number; cols: number; freq: string; coverage: { start: string; end: string } };
  schema: SchemaField[];
  sample: Record<string, unknown>[];
  stats: ColumnStat[];
  note?: string;
}

/** Derive the output columns + sample + stats for a derived artifact. A matrix
 *  carries its aligned feature columns; a feature/target/figure carries one
 *  value column named after itself. */
export function deriveArtifactData(node: Node, op: string | undefined, graph: LineageSubgraph, producerOps: Record<string, string>): ArtifactDataView {
  const freq = inferFreq(node.name);
  const valueCols: { name: string; op?: string; note?: string }[] =
    node.kind === "matrix"
      ? inputsOf(graph, node.id).map((i) => { const nn = nodeById(graph, i.id); return { name: nn?.name ?? i.id, op: producerOps[i.id] }; })
      : node.kind === "target"
        ? [{ name: node.name, note: "shifted strictly into the future" }]
        : [{ name: node.name }];

  const N = 8;
  const ts = tsSeq(freq, N);
  const seriesByCol = valueCols.map((c) => ({ c, s: opSeries(c.op ?? op, c.name, 48) }));

  const schema: SchemaField[] = [
    { name: "ts_event", type: "timestamp", role: "time", nullable: false, note: "point-in-time index" },
    ...valueCols.map((c) => ({ name: c.name, type: "float64", role: "value" as const, nullable: false, note: c.note })),
  ];
  const sample: Record<string, unknown>[] = ts.map((t, i) => {
    const row: Record<string, unknown> = { ts_event: t };
    for (const { c, s } of seriesByCol) row[c.name] = s[i].v;
    return row;
  });
  const stats = seriesByCol.map(({ c, s }) => statOf(c.name, s.map((p) => p.v)));

  return {
    shape: { rows: ROWS_BY_FREQ[freq], cols: valueCols.length + 1, freq, coverage: COVERAGE },
    schema,
    sample,
    stats,
    note: node.kind === "target" ? "values are shifted strictly into the future — only knowable after the model acts, so training can't peek ahead." : undefined,
  };
}

const VIEWS = ["Sample", "Schema", "Stats"] as const;
type View = (typeof VIEWS)[number];

const STAT_COLS: { key: keyof ColumnStat; label: string }[] = [
  { key: "mean", label: "mean" },
  { key: "std", label: "std" },
  { key: "min", label: "min" },
  { key: "p50", label: "p50" },
  { key: "max", label: "max" },
  { key: "nullPct", label: "null %" },
];

export function ArtifactData({ node, op, graph, producerOps }: { node: Node; op?: string; graph: LineageSubgraph; producerOps: Record<string, string> }) {
  const d = deriveArtifactData(node, op, graph, producerOps);
  const [tab, setTab] = useState<View>("Sample");
  const valueFields = d.schema.filter((f) => f.role === "value");

  return (
    <div className="mt-6">
      {/* coverage strip — the shape of the output */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-hairline divide-x divide-hairline">
        {([["rows", fmtCount(d.shape.rows)], ["columns", String(d.shape.cols)], ["freq", d.shape.freq], ["coverage", `${d.shape.coverage.start.slice(0, 7)} → ${d.shape.coverage.end.slice(0, 7)}`]] as [string, string][]).map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <div className="eyebrow">{k}</div>
            <div className="mt-1 font-mono text-body text-ink tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      {/* the data, tables-first — Sample by default */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="eyebrow">output</span>
        <div className="flex gap-1.5">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setTab(v)} className={`font-mono text-meta rounded-full border px-2.5 py-0.5 transition-colors ${tab === v ? "border-ink bg-ink text-paper" : "border-hairline-2 text-muted hover:border-ink"}`}>
              {v.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {tab === "Sample" && (
        <div className="mt-2 rounded-lg border border-hairline bg-white overflow-x-auto">
          <table className="w-full font-mono text-ui border-collapse">
            <thead>
              <tr className="border-b border-hairline text-faint">
                {d.schema.map((f) => (
                  <th key={f.name} title={f.type} className={`font-normal px-3 py-2 whitespace-nowrap ${f.role === "value" ? "text-right text-clay" : "text-left"}`}>{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.sample.map((row, i) => (
                <tr key={i} className="border-b border-hairline/50 last:border-0 text-ink-2">
                  {d.schema.map((f) => (
                    <td key={f.name} className={`px-3 py-1.5 whitespace-nowrap ${f.role === "value" ? "text-right tabular-nums text-ink" : "text-faint"}`}>
                      {f.role === "value" ? fmtNumber(row[f.name] as number) : String(row[f.name]).replace("T", " ").replace("Z", "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Schema" && (
        <div className="mt-2 rounded-lg border border-hairline bg-white overflow-hidden">
          <table className="w-full text-ui border-collapse">
            <thead>
              <tr className="border-b border-hairline text-faint font-mono text-meta uppercase tracking-[0.1em]">
                <th className="text-left font-normal px-4 py-2">column</th>
                <th className="text-left font-normal px-4 py-2">type</th>
                <th className="text-left font-normal px-4 py-2">role</th>
                <th className="text-left font-normal px-4 py-2 w-full">note</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {d.schema.map((f) => (
                <tr key={f.name} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 text-ink">{f.name}</td>
                  <td className="px-4 py-2 text-clay">{f.type}</td>
                  <td className="px-4 py-2">
                    {f.role && <span className={`text-meta uppercase tracking-[0.1em] border rounded-full px-1.5 py-0.5 ${f.role === "time" ? "border-green text-green" : "border-hairline-2 text-muted"}`}>{f.role}</span>}
                  </td>
                  <td className="px-4 py-2 text-faint">{f.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Stats" && (
        <div className="mt-2 rounded-lg border border-hairline bg-white overflow-x-auto">
          <table className="w-full font-mono text-meta border-collapse">
            <thead>
              <tr className="border-b border-hairline text-faint">
                <th className="text-left font-normal px-3 py-2">column</th>
                {STAT_COLS.map((c) => (
                  <th key={c.label} className="text-right font-normal px-3 py-2 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.stats.map((s) => (
                <tr key={s.name} className="border-b border-hairline/50 last:border-0 text-ink-2">
                  <td className="px-3 py-1.5 text-ink whitespace-nowrap">{s.name}</td>
                  {STAT_COLS.map((c) => {
                    if (c.key === "nullPct") return <td key={c.label} className="px-3 py-1.5 text-right tabular-nums text-faint">0</td>;
                    const v = s[c.key];
                    return <td key={c.label} className="px-3 py-1.5 text-right tabular-nums">{typeof v === "number" ? fmtNumber(v) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 font-mono text-meta text-faint">
        {valueFields.length} value column{valueFields.length === 1 ? "" : "s"} · illustrative — shaped by the operator, not real backend output.
        {d.note && <span className="text-green"> {d.note}</span>}
      </p>
    </div>
  );
}
