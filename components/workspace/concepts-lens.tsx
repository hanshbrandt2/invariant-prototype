"use client";

import type { Concept } from "@/lib/types";

/**
 * The Concepts lens: what each piece *is*, in context. Leads with the focused
 * artifact explained in plain language, then a legend of every kind present in
 * the analysis — so the graph reads to a non-expert. Doubles as the education
 * funnel. Real kinds only; no invented capabilities.
 */
export function ConceptsLens({
  focusLabel,
  focusKind,
  op,
  concept,
  pieces,
}: {
  focusLabel: string;
  focusKind: string;
  op?: string;
  concept?: Concept;
  pieces: { kind: string; what: string }[];
}) {
  return (
    <div className="p-6 md:p-8 max-w-[760px]">
      {concept && (
        <div className="border border-hairline bg-paper p-6">
          <p className="eyebrow text-clay">what this is · {focusKind}</p>
          <p className="mt-3 font-serif text-[1.25rem] leading-[1.45] text-ink">
            <span className="italic">{focusLabel}</span> is a {focusKind}
            {op && (
              <>
                {" "}
                — built by <span className="font-mono text-[0.95rem] text-clay">{op}</span>
              </>
            )}
            .
          </p>
          <p className="mt-4 text-[0.98rem] leading-[1.7] text-ink-2">{concept.what}</p>
          <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">{concept.why}</p>
        </div>
      )}

      {pieces.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-3">the pieces in this analysis</p>
          <ol className="border border-hairline bg-paper divide-y divide-hairline">
            {pieces.map((p) => (
              <li key={p.kind} className="flex gap-4 px-4 py-3.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-clay w-20 shrink-0 pt-0.5">
                  {p.kind}
                </span>
                <span className="text-[0.9rem] leading-[1.6] text-ink-2">{p.what}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
