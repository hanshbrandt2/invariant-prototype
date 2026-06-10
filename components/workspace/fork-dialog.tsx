"use client";

import { useState } from "react";

/**
 * The ⑂ fork dialog: vary a node's TYPED knob (the operator's only degrees of
 * freedom) to spawn sibling variants. Bounded by construction — you pick from
 * the valid options, nothing else. Running them is a metered build.
 */
export function ForkDialog({
  nodeLabel,
  param,
  options,
  built,
  current,
  onRun,
  onClose,
}: {
  nodeLabel: string;
  param: string;
  options: string[];
  built: string[]; // values already on the graph (incl. the current/spine one)
  current: string;
  onRun: (values: string[]) => void;
  onClose: () => void;
}) {
  const builtSet = new Set(built);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (v: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });

  const newCount = picked.size;
  const credits = +(newCount * 0.8).toFixed(1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] border border-ink bg-paper">
        <div className="px-5 py-4 border-b border-hairline">
          <p className="eyebrow text-clay">⑂ fork · vary {param}</p>
          <h2 className="mt-1 font-serif text-h2 font-semibold leading-tight">{nodeLabel}</h2>
          <p className="mt-1 text-ui text-muted">
            pick {param} values to build — each spawns a sibling and re-runs downstream.
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {options.map((v) => {
              const isBuilt = builtSet.has(v);
              const isCurrent = v === current;
              const on = picked.has(v);
              return (
                <button
                  key={v}
                  disabled={isBuilt}
                  onClick={() => toggle(v)}
                  className={`font-mono text-ui px-3 py-1.5 border rounded-full transition-colors ${
                    isBuilt
                      ? "border-hairline-2 text-faint cursor-default"
                      : on
                        ? "border-clay bg-clay text-paper"
                        : "border-hairline-2 text-ink-2 hover:border-ink"
                  }`}
                >
                  {param}={v}
                  {isCurrent ? " · on spine" : isBuilt ? " · built" : ""}
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-meta text-faint">
            bounded &amp; valid by construction — only this operator&rsquo;s knob.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between">
          <span className="font-mono text-meta text-muted">
            {newCount === 0 ? "select values to build" : `build ${newCount} new · ~${credits} credits`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="font-mono text-meta uppercase tracking-[0.1em] text-muted hover:text-ink px-2 py-1">
              cancel
            </button>
            <button
              disabled={newCount === 0}
              onClick={() => onRun([...picked])}
              className="font-mono text-meta uppercase tracking-[0.12em] bg-ink text-paper px-3.5 py-1.5 hover:bg-clay transition-colors disabled:opacity-40 disabled:hover:bg-ink"
            >
              run →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
