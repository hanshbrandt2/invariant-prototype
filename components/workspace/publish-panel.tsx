"use client";

import { useState } from "react";
import type { Node, ResultSpec, Validator } from "@/lib/types";
import { Figure } from "@/components/workspace/figure";
import { resultEquityFigure } from "@/lib/figures";
import { Metric, type MetricFormat } from "@/components/workspace/metric";

const METRIC_LABEL: Record<string, string> = { sharpe: "Sharpe", hit_rate: "Hit rate", max_drawdown: "Max DD", turnover: "Turnover", ann_return: "Ann. return" };
const METRIC_FMT: Record<string, MetricFormat> = { sharpe: "ratio", hit_rate: "number", max_drawdown: "signed-pct", turnover: "ratio", ann_return: "signed-pct" };
const shortDate = (iso?: string) => (iso ? iso.slice(0, 10) : "—");
const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

/**
 * Publish-a-finding: pins the terminal result as a read-only, citable artifact —
 * the finding + its metrics, intended invariant, eval window, lineage hash, and
 * as-of knowledge time, sealed with the validator verdict. GATED on the integrity
 * seal: you cannot publish a finding that is stale or violates an invariant, so
 * publishing IS an attestation (point-in-time · no-lookahead · reproducible). The
 * published sheet is frozen and shareable — "what stakeholders saw" stays
 * provably reproducible, not a stale screenshot.
 */
export function PublishPanel({
  result,
  spec,
  validator,
  sealOk,
  blockedReason,
  workspaceId,
  published,
  onPublish,
  onClose,
}: {
  result: Node;
  spec?: ResultSpec;
  validator?: Validator;
  sealOk: boolean;
  blockedReason?: string;
  workspaceId: string;
  published: boolean;
  onPublish: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const permalink = `/workspace/${workspaceId}?finding=${result.id}`;
  const pins = ["no-lookahead", "reproducible", ...((result.policyRefs ?? []).map(friendlyPolicy))];

  const copy = () => {
    const abs = typeof window !== "undefined" ? window.location.origin + permalink : permalink;
    navigator.clipboard?.writeText(abs).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 p-6" onClick={onClose}>
      <div className="w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-lg border border-hairline-2 bg-white" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-3 border-b border-hairline bg-white/95 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="eyebrow text-clay">{published ? "published finding · read-only" : "publish finding"}</p>
            <p className="font-serif text-h3 text-ink truncate">{spec?.friendlyName ?? result.name}</p>
          </div>
          <button onClick={onClose} aria-label="close" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-clay text-h3 leading-none">×</button>
        </div>

        {/* the finding sheet */}
        <div className="p-6">
          {spec ? (
            <>
              <div className="border border-hairline bg-paper p-4">
                <Figure spec={resultEquityFigure(spec)} height={190} />
              </div>
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 border border-hairline divide-x divide-hairline">
                {Object.entries(spec.metrics).slice(0, 5).map(([k, v]) => (
                  <div key={k} className="px-3 py-3">
                    <div className="eyebrow">{METRIC_LABEL[k] ?? k}</div>
                    <div className="mt-1 text-h3 text-ink">
                      <Metric value={v} format={METRIC_FMT[k] ?? "ratio"} validator={validator} lineageHash={result.lineageHash} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="eyebrow">intended invariant</p>
                <p className="mt-2 font-serif text-body leading-[1.6] text-ink-2">{spec.intendedInvariant}</p>
                <p className="mt-2 font-mono text-meta text-faint">eval {spec.evalWindow.start} → {spec.evalWindow.end}</p>
              </div>
              {spec.lineageRefs.length > 0 && (
                <div className="mt-5">
                  <p className="eyebrow">made from</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {spec.lineageRefs.map((r) => <span key={r} className="font-mono text-meta text-ink-2 border border-hairline px-2 py-0.5">{r}</span>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-body text-muted">No result spec for {result.name}.</p>
          )}

          {/* the seal strip — the proof that travels with the finding */}
          <div className="mt-6 border border-hairline bg-paper-2/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-meta">
              <span className={sealOk ? "text-green" : "text-clay"}>{sealOk ? "validated" : "blocked"}</span>
              {sealOk && pins.map((p) => <span key={p} className="text-muted">{p}</span>)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-meta text-faint">
              <span>lineage {result.lineageHash ?? "—"}</span>
              <span>as-of {shortDate(result.asOfKnowledgeTime)}</span>
              {result.owner && <span>by {result.owner}</span>}
            </div>
          </div>
        </div>

        {/* gate / action footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-hairline bg-paper-2/60">
          {published ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ui text-ink">Pinned read-only · won’t change as the workspace evolves.</p>
                <p className="mt-0.5 font-mono text-meta text-faint truncate">{permalink}</p>
              </div>
              <button onClick={copy} className="shrink-0 font-mono text-meta uppercase tracking-[0.1em] border border-ink text-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors">{copied ? "copied ✓" : "copy link"}</button>
            </div>
          ) : sealOk ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-ui leading-relaxed text-ink-2 max-w-[42ch]">Publishing pins this finding read-only and attests it is <span className="text-ink">point-in-time, no-lookahead, and reproducible</span> at the lineage above.</p>
              <button onClick={onPublish} className="shrink-0 font-mono text-meta uppercase tracking-[0.1em] border border-clay text-clay px-4 py-2 hover:bg-clay hover:text-paper transition-colors">Publish finding →</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-ui leading-relaxed text-clay-deep max-w-[44ch]">⚠ Can’t publish — {blockedReason ?? "the integrity seal isn’t green"}. Publishing attests the finding is reproducible and law-abiding, so resolve this first.</p>
              <button disabled className="shrink-0 font-mono text-meta uppercase tracking-[0.1em] border border-hairline-2 text-faint px-4 py-2 cursor-not-allowed">Publish finding →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
