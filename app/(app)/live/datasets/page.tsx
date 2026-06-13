"use client";

// /live/datasets — Phase-4 Slice 3: REAL hosted datasets from data-catalog.
// Metadata + schema are live; samples/stats/histograms are a backend ticket
// (T-3, labeled). No schema drift — HostedDataset shape is exact.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HostedDataset } from "@/lib/types";
import { listLiveHostedDatasets } from "@/lib/data";

export default function LiveDatasetsPage() {
  const [datasets, setDatasets] = useState<HostedDataset[]>([]);
  const [selected, setSelected] = useState<HostedDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLiveHostedDatasets()
      .then((d) => {
        setDatasets(d);
        if (d[0]) setSelected(d[0]);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const fmtRows = (n: number) =>
    n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

  return (
    <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-8 md:py-10">
      <div className="flex items-baseline gap-2">
        <Link href="/live" className="text-ui text-faint hover:text-clay">Live catalog</Link>
        <span className="text-faint">/</span>
        <span className="text-ui text-ink">Datasets</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">Live datasets</h1>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-meta uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> live · data-catalog
        </span>
        <Link href="/live" className="ml-auto text-ui text-faint hover:text-clay">← Artifacts</Link>
      </div>
      <p className="mt-1.5 text-body text-ink-2">
        Curated hosted datasets from <span className="font-mono text-meta">data-catalog (:8101)</span> — real metadata + schema. Samples / stats / histograms are not computed by the catalog (backend ticket T-3).
      </p>

      {loading && <p className="mt-10 text-ui text-muted">Loading datasets…</p>}
      {error && (
        <p className="mt-10 text-ui text-clay">Could not reach data-catalog: <span className="font-mono text-meta">{error}</span></p>
      )}

      {!loading && !error && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <div>
            <p className="eyebrow mb-3">Hosted [{datasets.length}]</p>
            <div className="space-y-1">
              {datasets.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`block w-full border px-3 py-2.5 text-left transition-colors ${
                    selected?.id === d.id ? "border-clay bg-clay-wash" : "border-hairline hover:border-ink-2"
                  }`}
                >
                  <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">{d.assetClass}</span>
                  <span className="block text-ui text-ink">{d.name}</span>
                  <span className="font-mono text-micro text-faint">{fmtRows(d.rows)} rows · {d.cols} cols</span>
                </button>
              ))}
              {datasets.length === 0 && <p className="text-ui text-muted">No hosted indexes registered.</p>}
            </div>
          </div>

          <div className="min-w-0">
            {selected ? (
              <div className="space-y-8">
                <div>
                  <h2 className="font-serif text-h2 text-ink">{selected.name}</h2>
                  <p className="mt-1 max-w-2xl text-body text-ink-2">{selected.blurb}</p>
                </div>

                <section>
                  <p className="eyebrow mb-2.5">Metadata</p>
                  <div className="overflow-hidden border border-hairline">
                    {[
                      ["schema", selected.schema],
                      ["asset class", selected.assetClass],
                      ["rows", `${fmtRows(selected.rows)} (${selected.rows.toLocaleString()})`],
                      ["columns", String(selected.cols)],
                      ["coverage", selected.coverage.start && selected.coverage.end ? `${selected.coverage.start} → ${selected.coverage.end}` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-hairline px-3.5 py-2 last:border-0">
                        <span className="font-mono text-meta uppercase tracking-[0.1em] text-muted">{k}</span>
                        <span className="font-mono text-ui text-ink-2">{v}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <p className="eyebrow mb-2.5">Schema · {selected.schemaFields.length} columns</p>
                  <div className="overflow-hidden border border-hairline">
                    {selected.schemaFields.map((f) => (
                      <div key={f.name} className="flex justify-between gap-4 border-b border-hairline px-3.5 py-1.5 last:border-0">
                        <span className="font-mono text-ui text-ink-2">{f.name}</span>
                        <span className="font-mono text-meta text-muted">{f.type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-meta text-faint">Column roles (time/key/value) live in the DSL, not the catalog (T-4).</p>
                </section>

                <section>
                  <p className="eyebrow mb-2.5">Samples · stats · distributions</p>
                  <div className="border border-dashed border-hairline-2 bg-paper-2/40 px-4 py-3 text-ui text-muted">
                    Not computed by data-catalog (it holds definitions, not values). Pending an EDA/stats source — <span className="font-mono text-meta">backend ticket T-3</span> (lib/api/MAPPING.md).
                  </div>
                </section>
              </div>
            ) : (
              <p className="text-ui text-muted">Select a dataset.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
