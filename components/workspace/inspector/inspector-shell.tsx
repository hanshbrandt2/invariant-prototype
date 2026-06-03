"use client";

import type { NodeKind, LifecycleState } from "@/lib/types";

/** One inspector, kind-aware. Header: kind + state badges, harness status,
 *  lineage hash, policy chips, breadcrumb. Body = the faces-by-kind face. */
export function InspectorShell({
  kind,
  name,
  id,
  version,
  state,
  lineageHash,
  policyRefs,
  canBack,
  onBack,
  onOpenLineage,
  children,
}: {
  kind: NodeKind;
  name: string;
  id: string;
  version?: string;
  state?: LifecycleState;
  lineageHash?: string;
  policyRefs?: string[];
  canBack: boolean;
  onBack: () => void;
  onOpenLineage: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-6 pt-5 pb-4 border-b border-hairline bg-paper">
        <div className="flex items-center gap-3 mb-3">
          {canBack && (
            <button onClick={onBack} className="font-mono text-[0.72rem] text-muted hover:text-clay transition-colors">
              ← back
            </button>
          )}
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] border border-ink px-2 py-0.5">
            {kind}
          </span>
          {state && (
            <span
              className={`font-mono text-[0.62rem] uppercase tracking-[0.14em] px-2 py-0.5 border ${
                state === "live" ? "border-[#3B6D11] text-[#3B6D11]" : "border-hairline-2 text-muted"
              }`}
            >
              {state}
            </span>
          )}
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#3B6D11]">checks ✓</span>
          {lineageHash && <span className="font-mono text-[0.68rem] text-faint ml-auto">{lineageHash}</span>}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[1.7rem] font-semibold leading-none">
              {name}
              {version && <span className="ml-2 font-mono text-[0.8rem] text-faint align-middle">{version}</span>}
            </h1>
            {policyRefs && policyRefs.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {policyRefs.map((p) => (
                  <span key={p} className="font-mono text-[0.66rem] border border-clay text-clay rounded-full px-2 py-0.5">
                    {p.split(":")[1] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenLineage}
            className="shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.12em] border border-ink px-3.5 py-2 hover:bg-ink hover:text-paper transition-colors"
          >
            how it was built →
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
