/**
 * Interfaces mirroring the real backend contracts (artifact-catalog).
 * Full field lists live in docs/BUILD_SPEC; this is the subset the
 * prototype currently needs. NEVER invent shapes here — extend from source.
 */

export type NodeSource = "artifact-catalog" | "registry" | "data-catalog";

export type ArtifactKind =
  | "dataset"
  | "feature"
  | "matrix"
  | "target"
  | "model"
  | "strategy"
  | "user_operator"
  | "policy"
  | "result"
  | "universe"
  | "figure";

export type NodeKind = ArtifactKind | "operator" | "raw-dataset";

export type LifecycleState = "scratch" | "saved" | "live" | "deployed";

export interface Node {
  id: string; // artifacts: `${kind}:${name}:${version}`
  source: NodeSource;
  kind: NodeKind;
  name: string;
  version?: string;
  state?: LifecycleState;
  contentHash?: string;
  lineageHash?: string;
  // row-level provenance (NOT in spec):
  policyRefs?: string[]; // `policy:<name>:<version>`
  pitConstruction?: "point_in_time" | "current_snapshot";
  createdAt?: string;
  spec?: unknown; // typed per kind (see BUILD_SPEC)
}

/**
 * Lineage edges encode DATA dependencies only. Policy governance is NOT a
 * lineage edge — it lives on the row as `policyRefs` (see artifact-catalog).
 */
export interface LineageEdge {
  childId: string;
  parentId: string;
  kind:
    | "input_dependency"
    | "training_data"
    | "input_model"
    | "stitch_source"
    | "presentation_source";
}

export interface LineageSubgraph {
  nodes: Node[];
  edges: LineageEdge[];
}
