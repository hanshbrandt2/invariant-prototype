"use client";

// /live — Phase-4 read-path proof (ADR-0002). REAL artifacts from artifact-catalog
// (:8102) through the BFF route handlers, rendered by the existing inspector
// components. This is the live read path, not fixtures — labeled as such (honesty bar).

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Node, LineageSubgraph } from "@/lib/types";
import { listLiveArtifacts, getLiveLineage } from "@/lib/data";
import { ContractTab } from "@/components/workspace/inspector/contract-tab";
import { SpecTable } from "@/components/workspace/inspector/spec-table";

export default function LivePage() {
  const [artifacts, setArtifacts] = useState<Node[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [lineage, setLineage] = useState<LineageSubgraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLiveArtifacts()
      .then((arts) => {
        setArtifacts(arts);
        if (arts[0]) select(arts[0]);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(n: Node) {
    setSelected(n);
    setLineage(null);
    getLiveLineage(n.id).then(setLineage).catch(() => setLineage(null));
  }

  const parents =
    lineage?.edges.filter((e) => e.childId === selected?.id) ?? [];

  return (
    <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-8 md:py-10">
      <div className="flex items-baseline gap-2">
        <Link href="/dashboard" className="text-ui text-faint hover:text-clay">
          Dashboard
        </Link>
        <span className="text-faint">/</span>
        <span className="text-ui text-ink">Live catalog</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">Live artifacts</h1>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-meta uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> live · artifact-catalog
        </span>
      </div>
      <p className="mt-1.5 text-body text-ink-2">
        Real artifacts read from <span className="font-mono text-meta">artifact-catalog (:8102)</span>{" "}
        through the BFF route handlers — not fixtures. {artifacts.length} registered.
      </p>

      {loading && <p className="mt-10 text-ui text-muted">Loading the live catalog…</p>}
      {error && (
        <p className="mt-10 text-ui text-clay">
          Could not reach the catalog: <span className="font-mono text-meta">{error}</span>
          <br />
          <span className="text-muted">
            Is the SSH tunnel up? <span className="font-mono">ssh -fNL 8102:localhost:8102 hans@ingest</span>
          </span>
        </p>
      )}

      {!loading && !error && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          {/* left — the artifact list */}
          <div>
            <p className="eyebrow mb-3">Artifacts [{artifacts.length}]</p>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
              {artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => select(a)}
                  className={`block w-full border px-3 py-2 text-left transition-colors ${
                    selected?.id === a.id
                      ? "border-clay bg-clay-wash"
                      : "border-hairline hover:border-ink-2"
                  }`}
                >
                  <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
                    {a.kind} · {a.state}
                  </span>
                  <span className="block truncate text-ui text-ink-2">{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* right — the selected real artifact */}
          <div className="min-w-0">
            {selected ? (
              <div className="space-y-8">
                <div>
                  <h2 className="font-serif text-h2 text-ink">{selected.name}</h2>
                  <p className="mt-0.5 font-mono text-meta text-muted">{selected.id}</p>
                </div>

                <section>
                  <p className="eyebrow mb-2.5">Contract</p>
                  <ContractTab node={selected} />
                </section>

                <section>
                  <p className="eyebrow mb-2.5">Spec (the real producer config)</p>
                  <SpecTable spec={selected.spec} />
                </section>

                <section>
                  <p className="eyebrow mb-2.5">Lineage — inputs [{parents.length}]</p>
                  {lineage === null ? (
                    <p className="text-ui text-muted">resolving…</p>
                  ) : parents.length === 0 ? (
                    <p className="text-ui text-muted">No registered input edges.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {parents.map((e) => {
                        const p = lineage.nodes.find((n) => n.id === e.parentId);
                        return (
                          <div
                            key={e.parentId}
                            className="flex items-center gap-2 border border-hairline-2 px-2.5 py-1.5"
                            title={`${e.kind} · ${e.parentId}`}
                          >
                            <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
                              {p?.source === "data-catalog" ? "raw" : p?.kind}
                            </span>
                            <span className="text-ui text-ink-2">{p?.name ?? e.parentId}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-meta text-faint">
                    1-hop via <span className="font-mono">/lineage</span>; in this catalog inputs are
                    external-ref edges into data-catalog (raw silver). See lib/api/MAPPING.md.
                  </p>
                </section>
              </div>
            ) : (
              <p className="text-ui text-muted">Select an artifact.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
