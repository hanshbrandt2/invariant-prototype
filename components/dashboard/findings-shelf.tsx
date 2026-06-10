"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublishedFinding } from "@/lib/types";
import { loadLocalFindings } from "@/lib/data";

/**
 * The Findings shelf — every published finding, the home publish-a-finding writes
 * to. Seeded findings come from the server; findings you publish are merged in
 * from the client store (localStorage). Each card is the frozen result + its seal
 * + lineage hash + as-of; opening one lands on the read-only finding sheet.
 */
export function FindingsShelf({ seeded }: { seeded: PublishedFinding[] }) {
  const [findings, setFindings] = useState<PublishedFinding[]>(seeded);

  // merge in anything published this browser (one per result, newest first)
  useEffect(() => {
    const map = new Map<string, PublishedFinding>();
    [...loadLocalFindings(), ...seeded].forEach((f) => { if (!map.has(f.id)) map.set(f.id, f); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge client-only localStorage after mount
    setFindings([...map.values()]);
  }, [seeded]);

  if (findings.length === 0) {
    return <p className="text-[0.88rem] text-muted">No findings published yet — open a validated result and hit <span className="font-mono text-[0.78rem]">Publish ⤴</span> to pin one here.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {findings.map((f) => <FindingCard key={f.id} f={f} />)}
    </div>
  );
}

const fmt = (k: string, v: number) =>
  k === "max_drawdown" || k === "ann_return" ? `${(v * 100).toFixed(1)}%` : k === "hit_rate" ? v.toFixed(3) : v.toFixed(2);
const KEY_METRICS: [string, string][] = [["sharpe", "Sharpe"], ["ann_return", "Ann."], ["max_drawdown", "Max DD"]];

function FindingCard({ f }: { f: PublishedFinding }) {
  return (
    <Link href={`/workspace/${f.workspaceId}?finding=${f.resultId}`} className="group flex flex-col border border-hairline bg-paper p-4 hover:border-ink transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="font-serif text-[1rem] leading-snug text-ink">{f.friendlyName}</span>
        {f.sealOk && <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-[#3B6D11] border border-[#3B6D11]/40 px-1.5 py-0.5">✓ sealed</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {KEY_METRICS.filter(([k]) => k in f.metrics).map(([k, label]) => (
          <span key={k} className="font-mono text-[0.82rem] text-ink-2">
            <span className="text-faint">{label} </span>{fmt(k, f.metrics[k])}
          </span>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-hairline flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[0.58rem] text-faint">
        <span>🔒 no-lookahead · reproducible</span>
        <span>{f.lineageHash}</span>
        <span>as-of {f.asOf ?? "—"}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[0.56rem] text-faint">{f.workspaceName} · published {f.publishedAt}{f.publishedBy ? ` · ${f.publishedBy}` : ""}</span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-clay group-hover:underline">open ▸</span>
      </div>
    </Link>
  );
}
