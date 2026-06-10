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
  const hero = f.stats?.[0];
  const rest = f.stats?.slice(1) ?? [];
  return (
    <button onClick={onOpen} className="group flex flex-col text-left border border-hairline bg-paper p-4 hover:border-ink transition-colors">
      {/* one quiet mono meta line — kind · verified — neutral, not colored chips (L4) */}
      <div className="flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.13em] text-faint">
        <span>{KIND_LABEL[f.kind ?? "strategy"]}</span>
        {f.sealOk && <span className="text-muted">verified</span>}
      </div>

      {/* one number leads the card (L1) */}
      {hero && (
        <div className="mt-3">
          <div className="font-mono text-display text-ink tabular-nums leading-none">{hero.value}</div>
          <div className="mt-1.5 font-mono text-meta uppercase tracking-[0.14em] text-muted">{hero.label}</div>
        </div>
      )}

      <p className="mt-3 font-serif text-h3 leading-snug text-ink min-h-[46px]">{f.headline ?? f.friendlyName}</p>

      {f.viz && <div className="mt-2 mb-1 overflow-hidden">{<FindingViz viz={f.viz} />}</div>}

      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {rest.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-body text-ink-2 tabular-nums leading-none">{s.value}</div>
              <div className="mt-0.5 text-meta text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <span className="font-mono text-meta text-faint">{f.workspaceName} · as-of {f.asOf ?? "—"} · no-lookahead</span>
        <span className="shrink-0 font-mono text-meta uppercase tracking-[0.1em] text-clay group-hover:underline">open ▸</span>
      </div>
    </button>
  );
}
