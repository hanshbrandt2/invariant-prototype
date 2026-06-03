"use client";

import { useState } from "react";
import type { HostedDataset } from "@/lib/types";
import { PreviewChart } from "@/components/workspace/preview-chart";

const TABS = ["Overview", "Table", "Schema", "Chart", "Code"] as const;
type Tab = (typeof TABS)[number];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

/** Default face for a dataset = Overview. Leads with the visual + numbers. */
export function DatasetOverview({ dataset: d }: { dataset: HostedDataset }) {
  const [tab, setTab] = useState<Tab>("Overview");

  const kpis: [string, string][] = [
    ["rows", fmt(d.rows)],
    ["columns", String(d.cols)],
    ["coverage", `${d.coverage.start.slice(0, 7)} → ${d.coverage.end.slice(0, 7)}`],
    ["missing", `${d.missingPct}%`],
  ];

  return (
    <div>
      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-hairline px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-[0.8rem] border-b-2 -mb-px transition-colors ${
              tab === t ? "border-clay text-ink" : "border-transparent text-muted hover:text-ink"
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
              <div className="mt-1.5 font-mono text-[1.05rem] text-ink tabular-nums">{v}</div>
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
            <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-2">{d.blurb}</p>
          </div>
        )}

        {tab === "Chart" && (
          <div className="mt-6 border border-hairline bg-paper p-4">
            <PreviewChart data={d.preview} height={340} />
          </div>
        )}

        {tab === "Table" && (
          <div className="mt-6 border border-hairline bg-paper overflow-x-auto">
            <table className="w-full font-mono text-[0.78rem]">
              <thead>
                <tr className="border-b border-hairline text-faint">
                  {["ts_event", "open", "high", "low", "close", "volume"].map((h) => (
                    <th key={h} className="text-left font-normal px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.preview.slice(0, 8).map((row, i) => {
                  const c = row.v;
                  return (
                    <tr key={i} className="border-b border-hairline/60 text-ink-2">
                      <td className="px-4 py-1.5">2024-01-02T09:{String(30 + i).padStart(2, "0")}Z</td>
                      <td className="px-4 py-1.5 tabular-nums">{(c * 0.999).toFixed(2)}</td>
                      <td className="px-4 py-1.5 tabular-nums">{(c * 1.002).toFixed(2)}</td>
                      <td className="px-4 py-1.5 tabular-nums">{(c * 0.997).toFixed(2)}</td>
                      <td className="px-4 py-1.5 tabular-nums text-ink">{c.toFixed(2)}</td>
                      <td className="px-4 py-1.5 tabular-nums">{(1200 + i * 37) % 4000}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Schema" && (
          <div className="mt-6 border border-hairline bg-paper divide-y divide-hairline">
            {d.schemaFields.map((f) => (
              <div key={f.name} className="flex items-center gap-4 px-4 py-2.5 font-mono text-[0.8rem]">
                <span className="text-ink w-40 shrink-0">{f.name}</span>
                <span className="text-clay w-24 shrink-0">{f.type}</span>
                <span className="text-faint">{f.note ?? ""}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Code" && (
          <div className="mt-6 border border-ink bg-ink text-paper p-5 font-mono text-[0.82rem] leading-relaxed overflow-x-auto">
            <span className="text-faint"># reproducible — runs anywhere</span>
            <br />
            <span className="text-clay">from</span> invariant <span className="text-clay">import</span> load
            <br />
            <br />
            df = load(<span className="text-[#d9b36b]">&quot;{d.id}&quot;</span>, schema=<span className="text-[#d9b36b]">&quot;{d.schema}&quot;</span>)
            <br />
            df.shape <span className="text-faint"># ({d.rows}, {d.cols})</span>
          </div>
        )}
      </div>
    </div>
  );
}
