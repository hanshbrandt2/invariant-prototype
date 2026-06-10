"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublishedFinding } from "@/lib/types";
import { loadLocalFindings } from "@/lib/data";
import { FindingViz } from "@/components/dashboard/finding-viz";

/**
 * The Findings shelf — published findings across every kind of research, each
 * leading with a plain-language one-liner + the picture that fits the task
 * (weights, risk bars, an attribution waterfall, an EDA distribution; strategy
 * leads with its numbers). Seeded findings come from the server; the ones you
 * publish merge in from the client store. Real, sealed findings open their
 * read-only sheet; illustrative desk examples are display cards.
 */
const KIND_LABEL: Record<string, string> = {
  strategy: "Strategy",
  portfolio: "Portfolio construction",
  risk: "Risk management",
  attribution: "Performance attribution",
  eda: "Exploratory data analysis",
};

export function FindingsShelf({ seeded }: { seeded: PublishedFinding[] }) {
  const [findings, setFindings] = useState<PublishedFinding[]>(seeded);

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

function FindingCard({ f }: { f: PublishedFinding }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-clay-deep bg-clay-wash border border-clay/30 px-1.5 py-0.5">{KIND_LABEL[f.kind ?? "strategy"]}</span>
        {f.sealOk && <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-[#3B6D11] border border-[#3B6D11]/40 px-1.5 py-0.5">✓ sealed</span>}
      </div>

      <p className="mt-2.5 font-serif text-[0.98rem] leading-[1.42] text-ink min-h-[68px]">{f.headline ?? f.friendlyName}</p>

      {f.viz && <div className="mt-1 mb-1 overflow-hidden">{<FindingViz viz={f.viz} />}</div>}

      {f.stats && f.stats.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {f.stats.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[0.95rem] text-ink tabular-nums leading-none">{s.value}</div>
              <div className="mt-0.5 text-[0.66rem] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <div className="font-mono text-[0.56rem] text-faint leading-relaxed">
          <div>🔒 no-lookahead · reproducible</div>
          <div>{f.workspaceName} · as-of {f.asOf ?? "—"}</div>
        </div>
        <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-clay group-hover:underline">{f.live ? "open ▸" : "finding"}</span>
      </div>
    </>
  );

  const cls = "group flex flex-col border border-hairline bg-paper p-4 transition-colors";
  return f.live ? (
    <Link href={`/workspace/${f.workspaceId}?finding=${f.resultId}`} className={`${cls} hover:border-ink`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
