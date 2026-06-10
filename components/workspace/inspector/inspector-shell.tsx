"use client";

import type { NodeKind, LifecycleState, Validator } from "@/lib/types";
import { TrustBadge } from "@/components/workspace/trust-badge";

/** One inspector, kind-aware. Header: kind + state badges, the validator
 *  (TrustBadge at chat zoom), lineage hash, policy chips, breadcrumb. Body =
 *  the faces-by-kind face. */
/** Friendly policy name from its id, when no presentational label is supplied. */
const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

export function InspectorShell({
  kind,
  name,
  version,
  state,
  op,
  lineageHash,
  policyRefs,
  policyLabels,
  validator,
  checks,
  onOpenChecks,
  onOpenLineage,
  children,
}: {
  kind: NodeKind;
  name: string;
  id: string;
  version?: string;
  state?: LifecycleState;
  op?: string; // the operator that produced this node (a verb, not a policy)
  lineageHash?: string;
  policyRefs?: string[];
  policyLabels?: Record<string, string>; // friendly policy names by ref id
  validator?: Validator;
  checks?: { passed: number; total: number; ok: boolean };
  onOpenChecks?: () => void;
  onOpenLineage?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-6 pt-5 pb-4 border-b border-hairline bg-paper">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-meta uppercase tracking-[0.14em] border border-ink px-2 py-0.5">
            {kind}
          </span>
          {state && (
            <span
              className={`font-mono text-meta uppercase tracking-[0.14em] px-2 py-0.5 border ${
                state === "live" ? "border-[#3B6D11] text-[#3B6D11]" : "border-hairline-2 text-muted"
              }`}
            >
              {state}
            </span>
          )}
          {validator ? (
            <TrustBadge validator={validator} zoom="chat" onClick={onOpenChecks} />
          ) : (
            checks &&
            checks.total > 0 && (
              <button
                onClick={onOpenChecks}
                disabled={!onOpenChecks}
                className={`font-mono text-meta uppercase tracking-[0.12em] enabled:hover:underline ${checks.ok ? "text-green" : "text-clay"}`}
              >
                checks {checks.passed}/{checks.total} {checks.ok ? "✓" : "!"}
              </button>
            )
          )}
          {lineageHash && <span className="font-mono text-meta text-faint ml-auto">{lineageHash}</span>}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-h1 font-semibold leading-none">
              {name}
              {version && <span className="ml-2 font-mono text-ui text-faint align-middle">{version}</span>}
            </h1>
            {/* what made it (operator = the verb) vs what governs it (policy) —
                two different layers, labelled so they don't get conflated */}
            {(op || (policyRefs && policyRefs.length > 0)) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {op && (
                  <span className="font-mono text-meta text-muted">
                    operator: <span className="text-ink-2">{op}</span>
                  </span>
                )}
                {policyRefs?.map((p) => (
                  <span key={p} className="font-mono text-meta text-muted">
                    policy: <span className="ml-0.5 text-clay border border-clay rounded-full px-2 py-0.5">{policyLabels?.[p] ?? friendlyPolicy(p)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {onOpenLineage && (
            <button
              onClick={onOpenLineage}
              className="shrink-0 font-mono text-meta uppercase tracking-[0.12em] border border-ink px-3.5 py-2 hover:bg-ink hover:text-paper transition-colors"
            >
              how it was built →
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
