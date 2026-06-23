"use client";

// components/live/artifact-charts.tsx — the "view the data as a chart" surface.
// Unlike the row sample, these distributions are computed over the FULL table
// (a pre-computed EDA sidecar on :8105), so they honestly describe all N rows.
// Numeric columns reuse the editorial <Histogram>; categorical columns get
// editorial top-N bars. A stats table sits underneath. Nothing is synthesized.

import { useEffect, useMemo, useState } from "react";
import type { LiveEdaSummary, LiveHistogram, ColumnHistogram } from "@/lib/types";
import { getLiveArtifactEda } from "@/lib/data";
import { Histogram } from "@/components/workspace/histogram";
import { ServiceDown } from "@/components/live/service-down";
import { fmtNumber } from "@/lib/format";
import { editorial } from "@/lib/theme/editorial";

const c = editorial.color;

/** Map the live numeric histogram onto the editorial <Histogram> contract. */
function toColumnHistogram(h: LiveHistogram): ColumnHistogram {
  return {
    column: h.name,
    bins: (h.bins ?? []).map((b) => ({ start: b.binStart, end: b.binEnd, count: b.count })),
  };
}

// research-workbench str()'s datetime objects into the EDA category values
// ("datetime.datetime(2015, 5, 6, 18, 29, …)"). It's a sibling-repo wart we read
// only — reformat the same value to a clean stamp, never fabricate.
function prettyCategory(v: string): string {
  const p = (s: string) => s.padStart(2, "0");
  let m = v.match(/^datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `${m[1]}-${p(m[2])}-${p(m[3])} ${p(m[4])}:${p(m[5])}`;
  m = v.match(/^datetime\.date\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return `${m[1]}-${p(m[2])}-${p(m[3])}`;
  return v;
}

function CategoryBars({ h }: { h: LiveHistogram }) {
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(
    () => [...(h.categories ?? [])].sort((a, b) => b.count - a.count),
    [h],
  );
  const cats = showAll ? all : all.slice(0, 12);
  const max = Math.max(1, ...all.map((x) => x.count));
  return (
    <div className="pt-1">
      <div className="space-y-1">
        {cats.map((cat) => {
          const label = prettyCategory(cat.value);
          return (
            <div key={cat.value} className="flex items-center gap-2">
              <span className="w-[42%] shrink-0 truncate font-mono text-micro text-ink-2" title={label}>
                {label}
              </span>
              <div className="h-3 flex-1 bg-paper-2">
                <div
                  className="h-full"
                  style={{ width: `${(cat.count / max) * 100}%`, backgroundColor: c.data }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-micro text-muted tabular-nums">
                {fmtNumber(cat.count)}
              </span>
            </div>
          );
        })}
      </div>
      {all.length > 12 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1.5 font-mono text-micro text-clay hover:underline"
        >
          {showAll ? "← top 12" : `show all ${all.length} loaded ↓`}
        </button>
      )}
    </div>
  );
}

const num = (v: number | string | null) =>
  v == null ? "—" : typeof v === "number" ? fmtNumber(v) : String(v);

export function ArtifactCharts({ artifactId }: { artifactId: string }) {
  const [eda, setEda] = useState<LiveEdaSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr(null);
    setEda(null);
    getLiveArtifactEda(artifactId)
      .then((e) => live && setEda(e ?? null))
      .catch((e) => live && setErr(String(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [artifactId]);

  if (loading) return <p className="text-ui text-muted">Loading distributions…</p>;
  if (err)
    return <ServiceDown service="research-workbench" port={8105} error={err} reach="local" />;
  if (!eda) {
    return (
      <div className="border border-hairline bg-paper-2/40 p-4">
        <p className="text-ui text-ink-2">No distribution summary for this artifact.</p>
        <p className="mt-1 text-meta text-faint">
          EDA summaries are computed at ingest. This artifact has no sidecar yet (or carries
          no tabular output).
        </p>
      </div>
    );
  }

  const generated = eda.generatedAt?.slice(0, 10) ?? "—";
  const statByName: Record<string, (typeof eda.columnStats)[number]> = Object.fromEntries(
    eda.columnStats.map((s) => [s.name, s]),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="eyebrow">Distributions</p>
        <p className="text-meta text-muted">
          over <span className="font-mono text-ink-2">{eda.sourceRowCount.toLocaleString()}</span>{" "}
          rows · pre-computed <span className="font-mono">{generated}</span>
        </p>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> real · research-workbench
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        {eda.histograms.map((h) => {
          const hasData = h.isNumeric ? (h.bins?.length ?? 0) > 0 : (h.categories?.length ?? 0) > 0;
          const nDistinct = statByName[h.name]?.nDistinct;
          return (
            <div key={h.name} className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-mono text-meta text-ink-2">{h.name}</span>
                <span className="font-mono text-micro uppercase tracking-[0.1em] text-faint">
                  {h.isNumeric
                    ? "numeric"
                    : `categorical · ${nDistinct != null ? nDistinct.toLocaleString() : "?"} distinct`}
                </span>
              </div>
              {!hasData ? (
                <p className="py-6 text-meta text-faint">No distribution computed.</p>
              ) : h.isNumeric ? (
                <Histogram hist={toColumnHistogram(h)} height={150} />
              ) : (
                <CategoryBars h={h} />
              )}
            </div>
          );
        })}
      </div>

      {/* full-population column statistics */}
      <p className="eyebrow mb-2 mt-8">Column statistics</p>
      <div className="overflow-x-auto border border-hairline">
        <table className="w-full border-collapse font-mono text-meta">
          <thead>
            <tr className="border-b-2 border-hairline-2 text-muted">
              {["column", "dtype", "count", "null %", "distinct", "min", "p50", "max"].map((th, i) => (
                <th
                  key={th}
                  className={`whitespace-nowrap px-3 py-1.5 font-normal uppercase tracking-[0.08em] ${i >= 2 ? "text-right" : "text-left"}`}
                >
                  {th}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eda.columnStats.map((s) => (
              <tr key={s.name} className="border-b border-hairline/60">
                <td className="whitespace-nowrap px-3 py-1.5 text-ink-2">{s.name}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-faint">{s.dtype}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{fmtNumber(s.count)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">
                  {s.nullPct.toFixed(s.nullPct ? 2 : 0)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{fmtNumber(s.nDistinct)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{num(s.minVal)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{num(s.p50)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{num(s.maxVal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
