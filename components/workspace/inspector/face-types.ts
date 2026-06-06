import type { Concept, HostedDataset, LineageEdge, LineageSubgraph, Node, ResultSpec } from "@/lib/types";

/** The common contract every kind-face receives. One inspector, faces by kind. */
export interface FaceProps {
  node: Node;
  label: string;
  op?: string; // the operator that produced this node
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  concepts: Record<string, Concept>;
  dataset?: HostedDataset; // dataset faces only
  spec?: ResultSpec; // result faces only
  onOpenNode: (id: string) => void;
}

/** The data inputs (parents) of a node, with their edge kind. */
export function inputsOf(graph: LineageSubgraph, id: string): { id: string; edgeKind: LineageEdge["kind"] }[] {
  return graph.edges.filter((e) => e.childId === id).map((e) => ({ id: e.parentId, edgeKind: e.kind }));
}

/** Nodes this one feeds into (children). */
export function outputsOf(graph: LineageSubgraph, id: string): string[] {
  return graph.edges.filter((e) => e.parentId === id).map((e) => e.childId);
}

export function nodeById(graph: LineageSubgraph, id: string): Node | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** A deterministic illustrative series shaped by the producing operator, so a
 *  feature/target can lead with a visual (not real backend output). */
export function opSeries(op: string | undefined, name: string, n = 48): { t: string; v: number }[] {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) >>> 0;
  const ph = (seed % 100) / 16;
  const out: { t: string; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    let v: number;
    if (op === "rolling_zscore") v = 2.2 * Math.sin(i * 0.5 + ph) + 0.5 * Math.sin(i * 1.7);
    else if (op === "lead") v = 0.6 * Math.sin(i * 0.6 + ph) + 0.3 * Math.cos(i * 0.9);
    else if (op === "coint_spread") v = 1.4 * Math.sin(i * 0.32 + ph);
    else if (op === "stitch_contracts") v = 75 + 8 * Math.sin(i * 0.25 + ph) + 0.4 * i * 0.2;
    else if (op === "derive_column" && /vol/i.test(name)) v = 0.3 + 0.18 * Math.abs(Math.sin(i * 0.4 + ph));
    else if (op === "derive_column") v = 0.4 * Math.sin(i * 0.8 + ph) + 0.2 * Math.sin(i * 2.1);
    else v = Math.sin(i * 0.5 + ph);
    out.push({ t: String(i + 1).padStart(2, "0"), v: +v.toFixed(3) });
  }
  return out;
}

export const KIND_NOUN: Record<string, string> = {
  dataset: "dataset", "raw-dataset": "raw dataset", feature: "feature", matrix: "matrix",
  target: "target", model: "model", result: "result", strategy: "strategy",
  universe: "universe", figure: "figure", policy: "policy", operator: "operator", user_operator: "operator",
};
