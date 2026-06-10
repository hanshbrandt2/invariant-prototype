"use client";

import Link from "next/link";
import type { PublishedFinding } from "@/lib/types";
import { FindingViz } from "@/components/dashboard/finding-viz";

const KIND_LABEL: Record<string, string> = {
  strategy: "Strategy",
  portfolio: "Portfolio construction",
  risk: "Risk management",
  attribution: "Performance attribution",
  eda: "Exploratory data analysis",
};

/** The read-only finding sheet — opens from any gallery card. Renders straight
 *  from the registry entry (no workspace needed), so every finding is viewable;
 *  a live finding also offers "open workspace" to drill into its lineage. */
export function FindingSheet({ finding: f, onClose }: { finding: PublishedFinding; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 p-6" onClick={onClose}>
      <div className="w-full max-w-[620px] max-h-[88vh] overflow-y-auto rounded-lg border border-hairline-2 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-3 border-b border-hairline bg-white/95 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="eyebrow text-clay">{KIND_LABEL[f.kind ?? "strategy"]} · finding · read-only</p>
            <p className="mt-0.5 font-serif text-h3 leading-snug text-ink truncate">{f.friendlyName}</p>
          </div>
          <button onClick={onClose} aria-label="close" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-clay text-h3 leading-none">×</button>
        </div>

        <div className="p-6">
          {f.headline && <p className="font-serif text-h2 leading-[1.42] text-ink mb-4">{f.headline}</p>}
          {f.viz && <div className="border border-hairline bg-paper-2/40 px-4 py-4 mb-4 overflow-x-auto">{<FindingViz viz={f.viz} />}</div>}
          {f.stats && f.stats.length > 0 && (
            <div className="flex flex-wrap gap-x-9 gap-y-3 mb-5">
              {f.stats.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-h2 text-ink tabular-nums leading-none">{s.value}</div>
                  <div className="mt-1 text-meta text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="border border-hairline bg-paper-2/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-meta">
              {f.sealOk && <span className="text-[#3B6D11]">✓ validated</span>}
              <span className="text-clay-deep">🔒 no-lookahead</span>
              <span className="text-clay-deep">🔒 reproducible</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-meta text-faint">
              <span>lineage {f.lineageHash ?? "—"}</span>
              <span>as-of {f.asOf ?? "—"}</span>
              {f.publishedBy && <span>by {f.publishedBy}</span>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t border-hairline bg-paper-2/60 flex items-center justify-between gap-3">
          <span className="font-mono text-meta text-faint">{f.workspaceName} · published {f.publishedAt ?? "—"}</span>
          {f.live ? (
            <Link href={`/workspace/${f.workspaceId}?finding=${f.resultId}`} className="font-mono text-meta uppercase tracking-[0.1em] border border-clay text-clay px-3 py-1.5 hover:bg-clay hover:text-paper transition-colors">open workspace ▸</Link>
          ) : (
            <span className="font-mono text-meta text-faint">illustrative desk example</span>
          )}
        </div>
      </div>
    </div>
  );
}
