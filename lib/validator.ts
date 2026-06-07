import type { LineageSubgraph, Node, Validator, Verdict } from "@/lib/types";
import { STAGE_LANES, STAGE_OF_KIND } from "@/lib/types";

/**
 * The single validator object, DERIVED — honest by construction. There are no
 * asserted greens: every pass is computed from the node's own contract fields
 * plus its place in the lineage, the same way the inspector's checks are.
 *
 *  - p1 inputs adapted  — only past information enters the decision
 *                         (no forward-reach back-edge; point-in-time inputs).
 *  - p2 target future   — a `target` must shift strictly forward via `lead`.
 *  - p3 falsification   — the forward-reach scan found no leak (ADR-0033).
 *  - reproducible       — a lineage_hash is pinned (ADR-0043).
 *
 * A real backend computes the transitive forward-reach closure (P1∧P2∧P3); the
 * mock approximates it from the graph + a `spec.leak` demo flag, so a red badge
 * is always traceable to a concrete cause, never decoration.
 */

const stageIndex = (node: Node | undefined): number => {
  if (!node) return -1;
  const s = STAGE_OF_KIND[node.kind];
  return s ? STAGE_LANES.indexOf(s) : -1;
};

/** A leak = this node reads from a node in a LATER stage (a forward-reach
 *  back-edge), or a deliberate demo flag on the spec. */
export function leakOf(node: Node, graph: LineageSubgraph): boolean {
  const spec = node.spec as Record<string, unknown> | undefined;
  if (spec?.leak === true) return true;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const myStage = stageIndex(node);
  if (myStage < 0) return false;
  return graph.edges.some((e) => {
    if (e.childId !== node.id) return false;
    const ps = stageIndex(byId.get(e.parentId));
    return ps >= 0 && ps > myStage;
  });
}

export function deriveValidator(node: Node, graph: LineageSubgraph): Validator {
  const spec = node.spec as Record<string, unknown> | undefined;
  const leak = leakOf(node, graph);
  const p1: Verdict = leak || node.pitConstruction === "current_snapshot" ? "fail" : "pass";
  // a target earns p2 only by shifting strictly into the future (lead)
  const p2: Verdict = node.kind === "target" ? (spec?.operator === "lead" ? "pass" : "fail") : "pass";
  const p3: Verdict = leak ? "fail" : "pass";
  const reproducible = !!node.lineageHash;
  const violatedPin =
    p1 === "fail" && node.pitConstruction === "current_snapshot"
      ? "pit_universe"
      : leak || p2 === "fail"
        ? "no_lookahead"
        : !reproducible && node.state === "live"
          ? "reproducible"
          : undefined;
  return { p1, p2, p3, reproducible, lineageHash: node.lineageHash, violatedPin };
}

/** Rolls the three adaptedness gates + reproducibility into one verdict. */
export function validatorOk(v: Validator): boolean {
  return v.p1 === "pass" && v.p2 === "pass" && v.p3 === "pass" && v.reproducible;
}

/** The honest "what this can't prove" lines the inspector badge surfaces — the
 *  validator's own caveats, kept beside the derivation so they stay truthful. */
export const VALIDATOR_CAVEAT = {
  adaptedness:
    "P3 is a falsification test, not a proof — a green gate means we failed to falsify on these fixtures; it cannot catch timestamp-correctness bugs or cross-sectional leaks hidden inside a bar.",
  reproducible:
    "The hash proves this artifact is pinned and exactly re-runnable. It does not prove the recipe is correct — only that it is this recipe, every time.",
};
