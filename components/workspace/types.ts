import type { Concept, LineageSubgraph, NodeKind, Node, HostedDataset, ResultSpec, Turn, VariantGroup, Sweep, Pin, Consequence, Vintage, Recipe } from "@/lib/types";

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
  code: Record<string, string>; // reproducible Python per node id (Code lens)
  concepts: Record<string, Concept>; // by NodeKind (Concepts lens)
  variants: Record<string, VariantGroup>; // by node id (forks / ⑂×N)
  sweep?: Sweep; // the workspace's parameter sweep (sibling results in one lane)
  invariants: Pin[]; // the contract rail's pins (the laws on this canvas)
  consequences: Consequence[]; // what the pinned laws DO to a build
  vintages: Vintage[]; // the As-of pin's revision-bearing series
  recipe?: Recipe; // this workspace crystallised as a recipe (the Promote panel)
  initialPromote?: boolean; // deep-link: open the Promote panel on mount
  initialAgentic?: boolean; // deep-link: fire a simulated agentic run on mount
  initialBuildPrompt?: string;
  initialDataId?: string;
  initialView?: "lineage";
  initialLens?: Lens;
  initialFocus?: string; // deep-link a node/edge focus
  initialDrawer?: InspectTarget; // deep-link the inspector drawer
  initialDrawerTab?: "overview" | "spec" | "contract" | "checks" | "code" | "lineage"; // deep-link the drawer tab
  initialFork?: string; // deep-link the fork dialog (node id)
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
 * The synthesis canvas is ONE surface — the live-building stage-laned graph,
 * with the terminal result promoted to an inline hero. `empty` is the
 * start-with-data invitation; `live` is the graph (it grows node-by-node).
 * Per-node detail opens in the slide-over inspector (the drawer), not by
 * switching the whole canvas — so there is no lens/focus on the canvas itself.
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
