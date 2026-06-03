import type { LineageSubgraph, Node, HostedDataset, ResultSpec, Turn } from "@/lib/types";

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
  initialBuildPrompt?: string;
  initialDataId?: string;
  initialView?: "lineage";
}

/** The one switchable canvas — leads with the visual, never code/metadata. */
export type CanvasView =
  | { kind: "empty" }
  | { kind: "building" }
  | { kind: "node"; nodeId: string }
  | { kind: "lineage"; ref: string };
