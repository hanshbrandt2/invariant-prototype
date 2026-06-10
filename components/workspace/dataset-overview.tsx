"use client";

import { useState } from "react";
import type { ColumnStat, HostedDataset, SchemaField } from "@/lib/types";
import { PreviewChart } from "@/components/workspace/preview-chart";
import { Histogram } from "@/components/workspace/histogram";
import { fmtCell, fmtCount, fmtNumber, isNumericType } from "@/lib/format";

const TABS = ["Overview", "Schema", "Stats", "Sample", "Chart"] as const;
type Tab = (typeof TABS)[number];

const STAT_COLS: { key: keyof ColumnStat; label: string }[] = [
  { key: "type", label: "type" },
  { key: "nullPct", label: "null %" },
  { key: "distinct", label: "distinct" },
  { key: "mean", label: "mean" },
  { key: "std", label: "std" },
  { key: "p01", label: "p01" },
  { key: "p50", label: "p50" },
  { key: "p99", label: "p99" },
  { key: "min", label: "min" },
  { key: "max", label: "max" },
];

const ROLE_CHIP: Record<string, { label: string; cls: string }> = {
  time: { label: "TIME", cls: "border-[#3B6D11] text-[#3B6D11]" },
  key: { label: "KEY", cls: "border-clay text-clay" },
};

/** Default face for a dataset = Overview. Leads with the visual + numbers. */
export function DatasetOverview({ dataset: d }: { dataset: HostedDataset }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [histCol, setHistCol] = useState(d.histograms?.[0]?.column ?? "");
  const timeField = d.schemaFields.find((f) => f.role === "time")?.name;
  const keyField = d.schemaFields.find((f) => f.role === "key")?.name;
  const rows = d.sampleRows ?? [];
  const stats = d.columnStats ?? [];
  const hist = d.histograms?.find((h) => h.column === histCol);

  const kpis: [string, string][] = [
    ["rows", fmtCount(d.rows)],
    ["columns", String(d.cols)],
    ["coverage", `${d.coverage.start.slice(0, 7)} → ${d.coverage.end.slice(0, 7)}`],
    ["missing", `${d.missingPct}%`],
  ];

  return (
    <div>
      {/* tabs */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-3 text-body border-b-2 -mb-px transition-colors ${
              tab === t ? "border-clay text-ink font-medium" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* KPI strip — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-hairline divide-x divide-hairline">
          {kpis.map(([k, v]) => (
            <div key={k} className="px-4 py-4">
              <div className="eyebrow">{k}</div>
              <div className="mt-1.5 font-mono text-h3 text-ink tabular-nums">{v}</div>
            </div>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <span className="eyebrow">close · preview</span>
              <span className="eyebrow">{d.schema}</span>
            </div>
            <div className="border border-hairline bg-paper p-4">
              <PreviewChart data={d.preview} height={220} />
            </div>
            <p className="mt-4 text-body leading-relaxed text-ink-2">{d.blurb}</p>
          </div>
        )}

        {tab === "Chart" && (
          <div className="mt-6 border border-hairline bg-paper p-4">
            <PreviewChart data={d.preview} height={340} />
          </div>
        )}

        {tab === "Sample" && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="eyebrow">sample · {rows.length} of {fmtCount(d.rows)} rows</span>
              <span className="eyebrow">{d.schema}</span>
            </div>
            <div className="rounded-lg border border-hairline bg-white overflow-x-auto">
              <table className="w-full font-mono text-ui border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-faint">
                    {d.schemaFields.map((f) => (
                      <th key={f.name} title={f.type} className={`font-normal px-3 py-2 whitespace-nowrap ${isNumericType(f.type) ? "text-right" : "text-left"}`}>
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-hairline/50 last:border-0 text-ink-2">
                      {d.schemaFields.map((f) => {
                        const v = row[f.name];
                        const num = isNumericType(f.type);
                        return (
                          <td key={f.name} className={`px-3 py-1.5 whitespace-nowrap ${num ? "text-right tabular-nums" : ""} ${v === null || v === undefined ? "text-faint" : f.role === "value" ? "text-ink" : ""}`}>
                            {fmtCell(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-meta text-faint">a deterministic sample, keyed by the schema — not the full table.</p>
          </div>
        )}

        {tab === "Schema" && (
          <div className="mt-6">
            <div className="rounded-lg border border-hairline bg-white overflow-hidden">
              <table className="w-full text-ui border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-faint font-mono text-meta uppercase tracking-[0.1em]">
                    <th className="text-left font-normal px-4 py-2">column</th>
                    <th className="text-left font-normal px-4 py-2">type</th>
                    <th className="text-left font-normal px-4 py-2">role</th>
                    <th className="text-left font-normal px-4 py-2">nullable</th>
                    <th className="text-left font-normal px-4 py-2 w-full">note</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {d.schemaFields.map((f: SchemaField) => {
                    const chip = f.role ? ROLE_CHIP[f.role] : undefined;
                    return (
                      <tr key={f.name} className="border-b border-hairline/50 last:border-0">
                        <td className="px-4 py-2 text-ink">{f.name}</td>
                        <td className="px-4 py-2 text-clay">{f.type}</td>
                        <td className="px-4 py-2">
                          {chip && <span className={`text-meta uppercase tracking-[0.1em] border rounded-full px-1.5 py-0.5 ${chip.cls}`}>{chip.label}</span>}
                        </td>
                        <td className={`px-4 py-2 ${f.nullable ? "text-muted" : "text-faint"}`}>{f.nullable ? "yes" : "no"}</td>
                        <td className="px-4 py-2 text-faint">{f.note ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-meta text-faint">
              {timeField && <>indexed on <span className="text-[#3B6D11]">{timeField}</span></>}
              {keyField && <> · keyed by <span className="text-clay">{keyField}</span></>}
              {" · "}{d.schemaFields.length} columns
            </p>
          </div>
        )}

        {tab === "Stats" && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="eyebrow">column profile</span>
              <span className="eyebrow text-faint">pre-computed snapshot · as of {d.coverage.end}</span>
            </div>
            <div className="rounded-lg border border-hairline bg-white overflow-x-auto">
              <table className="w-full font-mono text-meta border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-faint">
                    <th className="text-left font-normal px-3 py-2 sticky left-0 bg-white">column</th>
                    {STAT_COLS.map((c) => (
                      <th key={c.label} className={`font-normal px-3 py-2 whitespace-nowrap ${c.key === "type" ? "text-left" : "text-right"}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.name} className="border-b border-hairline/50 last:border-0 text-ink-2">
                      <td className="px-3 py-1.5 text-ink whitespace-nowrap sticky left-0 bg-white">{s.name}</td>
                      {STAT_COLS.map((c) => {
                        const v = s[c.key];
                        if (c.key === "type") return <td key={c.label} className="px-3 py-1.5 text-clay">{String(v)}</td>;
                        if (c.key === "nullPct") {
                          const n = v as number;
                          return <td key={c.label} className={`px-3 py-1.5 text-right tabular-nums ${n > 0 ? "text-clay" : "text-faint"}`}>{n > 0 ? `${n}%` : "0"}</td>;
                        }
                        const txt = v === undefined || v === null ? "—" : typeof v === "number" ? fmtNumber(v) : String(v);
                        return <td key={c.label} className={`px-3 py-1.5 text-right tabular-nums ${txt === "—" ? "text-faint" : ""}`}>{txt}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {d.histograms && d.histograms.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="eyebrow">distribution</span>
                  <div className="flex flex-wrap gap-1.5">
                    {d.histograms.map((h) => (
                      <button
                        key={h.column}
                        onClick={() => setHistCol(h.column)}
                        className={`font-mono text-meta rounded-full border px-2 py-0.5 transition-colors ${histCol === h.column ? "border-ink bg-ink text-paper" : "border-hairline-2 text-muted hover:border-ink"}`}
                      >
                        {h.column}
                      </button>
                    ))}
                  </div>
                </div>
                {hist && (
                  <div className="rounded-lg border border-hairline bg-white p-3">
                    <Histogram hist={hist} />
                    <p className="mt-1 font-mono text-meta text-faint">
                      {histCol} · {stats.find((s) => s.name === histCol)?.type} · {stats.find((s) => s.name === histCol)?.nullPct ?? 0}% null · {hist.bins.length} bins
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
