import type { Concept, LineageSubgraph, NodeKind, Node, HostedDataset, ResultSpec, Turn, VariantGroup, Sweep, Pin, Consequence, Vintage, Recipe, RecipeRun } from "@/lib/types";

/** Everything the (client) workspace needs, pre-loaded server-side. */
export interface WorkspaceBundle {
  workspaceId: string;
  workspaceName: string;
  isNew: boolean;
  initialTurns: Turn[];
  lineage: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  nodes: Record<string, Node>;
  datasets: Record<string, HostedDataset>;
  resultSpecs: Record<string, ResultSpec>;
  starterPrompts?: string[]; // example questions for the empty canvas (one-click starts)
  code: Record<string, string>; // reproducible Python per node id (Code lens)
  concepts: Record<string, Concept>; // by NodeKind (Concepts lens)
  variants: Record<string, VariantGroup>; // by node id (forks / ⑂×N)
  sweep?: Sweep; // the workspace's parameter sweep (sibling results in one lane)
  invariants: Pin[]; // the pins (the laws on this canvas) — surfaced in the audit panel
  consequences: Consequence[]; // what the pinned laws DO to a build
  vintages: Vintage[]; // the As-of pin's revision-bearing series
  recipe?: Recipe; // this workspace crystallised as a recipe (the Promote panel)
  runs?: RecipeRun[]; // the recipe's run history (audit log) — newest first
  initialPromote?: boolean; // deep-link: open the Promote panel on mount
  initialAgentic?: "clean" | "halt"; // deep-link: fire a simulated agentic run on mount
  initialCodeView?: boolean; // deep-link: open the Code view on mount
  initialBuildPrompt?: string;
  initialDataId?: string;
  initialView?: "lineage";
  initialLens?: Lens;
  initialFocus?: string; // deep-link a node/edge focus
  initialDrawer?: InspectTarget; // deep-link the inspector drawer
  initialDrawerTab?: "overview" | "spec" | "contract" | "checks" | "code" | "lineage"; // deep-link the drawer tab
  initialFork?: string; // deep-link the fork dialog (node id)
  initialNode?: string; // deep-link a session-tree node — restores the exact node (deep-link > localStorage > bundle)
  initialRevise?: string; // deep-link: mark this node changed → downstream stale (reactive demo)
  initialFinding?: string; // deep-link: open the read-only published finding (consumer view)
  initialPublish?: boolean; // deep-link: open the publish panel in author mode (shows the seal gate)
}

/** The four ways the same analysis is told (a switcher, not stacked sections). */
export type Lens = "result" | "graph" | "code" | "concepts";

/** What the inspector drawer is showing (opened from the Graph lens). The graph
 *  stays put behind it; closing returns you to exactly where you were. */
export type InspectTarget =
  | { type: "node"; id: string }
  | { type: "edge"; parentId: string; childId: string }
  | { type: "compare"; nodeId: string };

/**
 * The canvas PHASE: `empty` is the start-with-data invitation; `live` is the
 * built analysis (it grows node-by-node as builds stream). How the live
 * analysis is *told* is the orthogonal `Lens` (Result / Graph / Code /
 * Concepts) — a top-level switcher. Per-node detail still opens in the
 * slide-over inspector (the drawer), over whichever lens is showing.
 */
export type CanvasState = { phase: "empty" } | { phase: "live" };

/** An edge "focus" — clicking a lineage edge inspects the relationship, not a
 *  node. Encoded as a focus token so it rides the same nav stack. */
const EDGE = "__edge__";
export function edgeFocus(parentId: string, childId: string): string {
  return `${EDGE}|${parentId}|${childId}`;
}
export function parseEdgeFocus(focus: string): { parentId: string; childId: string } | null {
  if (!focus.startsWith(`${EDGE}|`)) return null;
  const [, parentId, childId] = focus.split("|");
  return { parentId, childId };
}

export const KIND_LABEL: Partial<Record<NodeKind, string>> = {
  dataset: "dataset",
  "raw-dataset": "dataset",
  feature: "feature",
  matrix: "matrix",
  target: "target",
  model: "model",
  result: "result",
  policy: "policy",
  universe: "universe",
  strategy: "strategy",
  figure: "figure",
  operator: "operator",
  user_operator: "operator",
};
