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

/* ─────────────────────────────────────────────────────────────────
   Surfaces: hosted data, workspaces, conversation, builds.
   All fake (lib/fixtures) but shaped to the real contracts so a live
   backend swaps in behind lib/data with no component changes.
   ───────────────────────────────────────────────────────────────── */

export interface HostedDataset {
  id: string; // e.g. "crude_oil_1m"
  name: string; // human label, e.g. "WTI Crude Oil"
  schema: string; // real schema, e.g. "databento.silver.ohlcv-1m"
  assetClass: "energy" | "equities" | "fx" | "rates" | "metals" | "crypto";
  blurb: string;
  rows: number;
  cols: number;
  coverage: { start: string; end: string };
  missingPct: number;
  preview: { t: string; v: number }[]; // small series for the overview chart
  schemaFields: { name: string; type: string; note?: string }[];
}

export interface Workspace {
  id: string; // slug, e.g. "crude-oil-research"
  name: string;
  summary: string;
  updatedAt: string;
  recentlyActive?: boolean;
  lineage: LineageSubgraph; // drives the card thumbnail
}

export type NextAction =
  | { type: "push_node"; ref: string }
  | { type: "open_catalog"; filter?: Record<string, unknown> }
  | { type: "chip"; label: string; prompt: string };

export interface Turn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  actions?: NextAction[];
}

export interface StarterPrompt {
  text: string;
  op: string; // the real operator(s) that realize it — honesty bar
  dataset: string; // a real hosted dataset / universe
}

/* Build simulation (lib/sim — treated like a streaming backend). */
export interface BuildStep {
  id: string;
  label: string; // plain-intent label
  op?: string; // the real operator name (shown in deep view only)
  credits: number;
}

export type BuildEvent =
  | { type: "step_start"; step: BuildStep; index: number; total: number }
  | { type: "step_done"; step: BuildStep; index: number; total: number }
  | { type: "done"; producedId: string };

export interface BuildEstimate {
  steps: number;
  credits: number;
  etaSec: number;
  big: boolean; // true → show the estimate+confirm gate
  scopeNote?: string; // e.g. "10 years" — scoping down drops the estimate
}

export interface BuildRequest {
  prompt: string;
  datasetId?: string;
  workspaceId?: string;
}

/* result spec (subset of the real ResultSpec) */
export type NextProposal =
  | {
      kind: "feature_modification" | "policy_swap" | "retrain" | "universe_change";
      summary: string;
    }
  | { kind: "none"; reason: string };

export interface ResultSpec {
  friendlyName: string;
  intendedInvariant: string;
  evalWindow: { start: string; end: string };
  metrics: Record<string, number>;
  lineageRefs: string[];
  nextProposal: NextProposal;
}
