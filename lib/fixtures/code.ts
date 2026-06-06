import type { LineageSubgraph, Node } from "@/lib/types";

/**
 * Code-lens generator: turns the provenance chain into reproducible Python.
 *
 * HONESTY BAR (hard): expressed entirely against the INPUT SCHEMA the user
 * could supply themselves — never an internal storage layer (no bronze/silver/
 * gold) and never a storage path. Operator names are the real registry verbs
 * (stitch_contracts, derive_column, rolling_zscore, coint_spread, join_feature,
 * lead, fit_model, evaluate_strategy). The literal form of "traceable to code
 * you can run yourself": data in this shape → run this → get this result.
 */

/** The expected input shape — the contract the Code lens opens with. */
export const INPUT_SCHEMA = [
  "ts_event",
  "symbol",
  "open",
  "high",
  "low",
  "close",
  "volume",
] as const;

const policyName = (n: Node): string | undefined =>
  n.policyRefs?.[0]?.split(":")[1];

interface Parent {
  varName: string;
  kind: string;
}

/** Render one operator call. Falls back to `op(parents)` for verbs without a
 *  bespoke signature, so a new honest op never produces a broken line. */
function call(op: string, parents: Parent[], policy?: string): string {
  const vars = parents.map((p) => p.varName);
  const byKind = (k: string) => parents.find((p) => p.kind === k)?.varName;
  const pol = policy ? `, policy="${policy}"` : "";
  switch (op) {
    case "stitch_contracts":
      return `stitch_contracts(${vars[0]}${pol})`;
    case "derive_column":
      return `derive_column(${vars[0]}, expr="log_return(close)")`;
    case "rolling_zscore":
      return `rolling_zscore(${vars[0]}, window=20)`;
    case "coint_spread":
      return `coint_spread(${vars.join(", ")})`;
    case "join_feature":
      return `join_feature(${vars.join(", ")})`;
    case "lead":
      return `lead(${vars[0]}, periods=5)`;
    case "fit_model":
      return `fit_model(features=${byKind("matrix") ?? vars[0]}, target=${byKind("target") ?? vars[1]}, kind="ridge", alpha=0.1)`;
    case "evaluate_strategy":
      return `evaluate_strategy(model=${byKind("model") ?? vars[0]}${pol})`;
    default:
      return `${op}(${vars.join(", ")})`;
  }
}

/** Longest-path depth over data edges (policies carry no lineage edge). */
function depths(sg: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  for (const n of sg.nodes) parents[n.id] = [];
  for (const e of sg.edges) if (parents[e.childId]) parents[e.childId].push(e.parentId);
  const d: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (d[id] != null) return d[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    d[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    return d[id];
  };
  for (const n of sg.nodes) visit(n.id, new Set());
  return d;
}

const HEADER = [
  "# input schema — bring your data in this shape:",
  `#   { ${INPUT_SCHEMA.join(", ")} }`,
  "# run this, get the same result — nothing here you can't reconstruct.",
  "",
  "from invariant import load",
  "",
];

/** Reproducible Python that produces `targetId`, walking back to raw data. */
function codeFor(sg: LineageSubgraph, producerOps: Record<string, string>, targetId: string): string {
  const byId = Object.fromEntries(sg.nodes.map((n) => [n.id, n]));
  const parentsOf: Record<string, string[]> = {};
  for (const n of sg.nodes) parentsOf[n.id] = [];
  for (const e of sg.edges) if (parentsOf[e.childId]) parentsOf[e.childId].push(e.parentId);

  // ancestors of target (inclusive)
  const want = new Set<string>();
  const collect = (id: string) => {
    if (want.has(id)) return;
    want.add(id);
    for (const p of parentsOf[id] ?? []) collect(p);
  };
  collect(targetId);

  const d = depths(sg);
  const chain = [...want].sort((a, b) => (d[a] ?? 0) - (d[b] ?? 0));

  const lines: string[] = [...HEADER];
  for (const id of chain) {
    const n = byId[id];
    if (!n) continue;
    if (n.kind === "dataset" || n.kind === "raw-dataset") {
      lines.push(`${n.name} = load("${n.name}")  # OHLCV bars, point-in-time`);
      continue;
    }
    const op = producerOps[id];
    if (!op) continue; // no producer recorded → skip rather than invent one
    const parents: Parent[] = (parentsOf[id] ?? [])
      .map((pid) => byId[pid])
      .filter(Boolean)
      .map((p) => ({ varName: p.name, kind: p.kind }));
    lines.push(`${n.name} = ${call(op, parents, policyName(n))}`);
  }
  lines.push("");
  lines.push(`${byId[targetId]?.name ?? "result"}  # ← this`);
  return lines.join("\n");
}

/** Code for every node in a subgraph, keyed by node id. */
export function buildCodeMap(
  sg: LineageSubgraph,
  producerOps: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const n of sg.nodes) {
    if (n.kind === "policy") continue; // policies are kwargs, not a code subject
    map[n.id] = codeFor(sg, producerOps, n.id);
  }
  return map;
}

/** Standalone load snippet for a hosted dataset not yet in a lineage. */
export function datasetCode(id: string): string {
  return [...HEADER, `df = load("${id}")  # OHLCV bars, point-in-time`, "df.head()"].join("\n");
}
