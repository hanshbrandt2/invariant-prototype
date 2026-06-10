"use client";

import { useEffect, useState } from "react";
import type { PublishedFinding } from "@/lib/types";
import { loadLocalFindings } from "@/lib/data";
import { FindingViz } from "@/components/dashboard/finding-viz";
import { FindingSheet } from "@/components/dashboard/finding-sheet";

/**
 * The Findings shelf — published findings across every kind of research, each
 * leading with a plain-language one-liner + the picture that fits the task
 * (weights, risk bars, an attribution waterfall, an EDA distribution; strategy
 * leads with its numbers). Clicking any card opens its read-only sheet.
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
  const [open, setOpen] = useState<PublishedFinding | null>(null);

  // merge the client store with the seeds. For an id in both, the seed BACKFILLS
  // any fields an older localStorage entry is missing (kind/stats/viz/live), so a
  // finding published before those existed still renders + clicks correctly.
  useEffect(() => {
    const seedById = new Map(seeded.map((s) => [s.id, s] as const));
    const out = new Map<string, PublishedFinding>();
    for (const l of loadLocalFindings()) {
      const s = seedById.get(l.id);
      out.set(l.id, s ? { ...s, ...l } : l);
    }
    for (const s of seeded) if (!out.has(s.id)) out.set(s.id, s);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge client-only localStorage after mount
    setFindings([...out.values()]);
  }, [seeded]);

  if (findings.length === 0) {
    return <p className="text-body text-muted">No findings published yet — open a validated result and hit <span className="font-mono text-ui">Publish ⤴</span> to pin one here.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {findings.map((f) => <FindingCard key={f.id} f={f} onOpen={() => setOpen(f)} />)}
      </div>
      {open && <FindingSheet finding={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function FindingCard({ f, onOpen }: { f: PublishedFinding; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex flex-col text-left border border-hairline bg-paper p-4 hover:border-ink transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-clay-deep bg-clay-wash border border-clay/30 px-1.5 py-0.5">{KIND_LABEL[f.kind ?? "strategy"]}</span>
        {f.sealOk && <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] text-[#3B6D11] border border-[#3B6D11]/40 px-1.5 py-0.5">✓ sealed</span>}
      </div>

      <p className="mt-2.5 font-serif text-body leading-[1.42] text-ink min-h-[68px]">{f.headline ?? f.friendlyName}</p>

      {f.viz && <div className="mt-1 mb-1 overflow-hidden">{<FindingViz viz={f.viz} />}</div>}

      {f.stats && f.stats.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {f.stats.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-body text-ink tabular-nums leading-none">{s.value}</div>
              <div className="mt-0.5 text-meta text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <div className="font-mono text-micro text-faint leading-relaxed">
          <div>🔒 no-lookahead · reproducible</div>
          <div>{f.workspaceName} · as-of {f.asOf ?? "—"}</div>
        </div>
        <span className="shrink-0 font-mono text-meta uppercase tracking-[0.1em] text-clay group-hover:underline">open ▸</span>
      </div>
    </button>
  );
}
