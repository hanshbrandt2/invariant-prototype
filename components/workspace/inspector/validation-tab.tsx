"use client";

import type { LineageSubgraph, Node, Validator } from "@/lib/types";
import { TrustBadge } from "@/components/workspace/trust-badge";

type Status = "pass" | "warn" | "info";
interface Check {
  label: string;
  status: Status;
  detail: string;
}

/** Transitive upstream / downstream counts from the lineage edges. */
function reach(graph: LineageSubgraph, id: string, dir: "up" | "down"): number {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of graph.edges) {
      const [from, to] = dir === "up" ? [e.childId, e.parentId] : [e.parentId, e.childId];
      if (from === cur && !seen.has(to)) {
        seen.add(to);
        stack.push(to);
      }
    }
  }
  return seen.size;
}

/** Build the honest check list — every item is DERIVED from the graph + the
 *  node's own contract fields, never asserted. Unprovable claims are omitted. */
function deriveChecks(node: Node, graph: LineageSubgraph): Check[] {
  const checks: Check[] = [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const parents = graph.edges.filter((e) => e.childId === node.id).map((e) => e.parentId);
  const spec = node.spec as Record<string, unknown> | undefined;

  // inputs resolve to real nodes in the graph
  if (parents.length) {
    const missing = parents.filter((p) => !byId.has(p));
    checks.push(
      missing.length
        ? { label: "inputs resolved", status: "warn", detail: `${missing.length} input not found in the graph` }
        : { label: "inputs resolved", status: "pass", detail: `all ${parents.length} input${parents.length === 1 ? "" : "s"} present` }
    );
  }

  // lineage pinned — only meaningful for DERIVED artifacts; a policy/operator
  // is an authored definition, not computed from inputs, so it has no lineage.
  const isDerived = node.kind !== "policy" && node.kind !== "operator";
  if (isDerived) {
    checks.push(
      node.lineageHash
        ? { label: "lineage pinned", status: "pass", detail: node.lineageHash }
        : { label: "lineage pinned", status: node.state === "live" ? "warn" : "info", detail: "no lineage hash recorded yet" }
    );
  }

  // typed spec recorded
  checks.push(
    spec && Object.keys(spec).length
      ? { label: "spec recorded", status: "pass", detail: `${Object.keys(spec).length} typed field${Object.keys(spec).length === 1 ? "" : "s"}` }
      : { label: "spec recorded", status: "info", detail: "free-form artifact, no typed spec" }
  );

  // point-in-time construction (datasets) or no-lookahead (targets)
  if (node.pitConstruction) {
    checks.push(
      node.pitConstruction === "point_in_time"
        ? { label: "point-in-time inputs", status: "pass", detail: "constructed point-in-time — no revision leakage" }
        : { label: "point-in-time inputs", status: "warn", detail: "current snapshot — may embed revisions" }
    );
  }
  if (node.kind === "target" && spec?.operator === "lead") {
    checks.push({ label: "no lookahead", status: "pass", detail: "target is shifted strictly into the future (lead)" });
  }

  // governance
  if (node.policyRefs?.length) {
    checks.push({ label: "policy governed", status: "pass", detail: `${node.policyRefs.length} policy attached` });
  }

  // policy review status
  if (node.kind === "policy") {
    const review = spec?.reviewStatus as string | undefined;
    checks.push(
      review === "approved"
        ? { label: "review approved", status: "pass", detail: "approved by the policy owner" }
        : { label: "review status", status: "warn", detail: review ?? "unreviewed" }
    );
  }

  return checks;
}

/** Header-badge summary: how many checks pass, and whether any warn. */
export function summarizeChecks(node: Node, graph: LineageSubgraph): { passed: number; total: number; ok: boolean } {
  const checks = deriveChecks(node, graph);
  return { passed: checks.filter((c) => c.status === "pass").length, total: checks.length, ok: checks.every((c) => c.status !== "warn") };
}

const DOT: Record<Status, { c: string; ch: string }> = {
  pass: { c: "text-[#3B6D11]", ch: "✓" },
  warn: { c: "text-clay", ch: "!" },
  info: { c: "text-muted", ch: "·" },
};

/**
 * The Validation tab — replaces the decorative "checks ✓" with real, derived
 * checks plus the node's upstream/downstream reach. Everything here is computed
 * from the lineage + contract; nothing is asserted.
 */
export function ValidationTab({
  node,
  graph,
  validator,
  onFlashPin,
}: {
  node: Node;
  graph: LineageSubgraph;
  validator?: Validator;
  onFlashPin?: (pinId: string) => void;
}) {
  const checks = deriveChecks(node, graph);
  const up = reach(graph, node.id, "up");
  const down = reach(graph, node.id, "down");
  const passed = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="p-6 space-y-6">
      {validator && (
        <section>
          <p className="eyebrow mb-2">harness verdict</p>
          <TrustBadge validator={validator} zoom="inspector" onFlashPin={onFlashPin} />
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <p className="eyebrow">checks</p>
          <span className="font-mono text-meta text-faint">{passed} / {checks.length} pass</span>
        </div>
        <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-3 px-4 py-2.5">
              <span className={`font-mono text-body leading-5 shrink-0 ${DOT[c.status].c}`}>{DOT[c.status].ch}</span>
              <div className="min-w-0">
                <div className="text-ui text-ink">{c.label}</div>
                <div className="font-mono text-meta text-muted break-all">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2">lineage reach</p>
        <div className="grid grid-cols-2 rounded-lg border border-hairline bg-white divide-x divide-hairline overflow-hidden">
          <div className="px-4 py-3.5">
            <div className="eyebrow">upstream</div>
            <div className="mt-1 font-mono text-h3 text-ink tabular-nums">{up}</div>
            <div className="font-mono text-meta text-faint">ancestors it depends on</div>
          </div>
          <div className="px-4 py-3.5">
            <div className="eyebrow">downstream</div>
            <div className="mt-1 font-mono text-h3 text-ink tabular-nums">{down}</div>
            <div className="font-mono text-meta text-faint">artifacts that depend on it</div>
          </div>
        </div>
      </section>
    </div>
  );
}
