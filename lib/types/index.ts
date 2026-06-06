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
  description?: string; // human-readable (backend add; mock it now)
  contentHash?: string;
  lineageHash?: string;
  // row-level provenance (NOT in spec):
  policyRefs?: string[]; // `policy:<name>:<version>`
  pitConstruction?: "point_in_time" | "current_snapshot";
  producerCodeHash?: string; // git hash of the operator code that produced this
  asOfKnowledgeTime?: string; // point-in-time knowledge cutoff of the inputs
  owner?: string; // workspace member who authored/owns the artifact
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

/** A column in a dataset's schema. role/nullable are declared catalog metadata
 *  the real backend carries (the time index, the key, nullability). */
export interface SchemaField {
  name: string;
  type: string;
  nullable?: boolean;
  role?: "time" | "key" | "value";
  note?: string;
}

/** A pre-computed per-column statistic (what a real EDA sidecar ships as JSON).
 *  Authored constant — never computed live in the browser. */
export interface ColumnStat {
  name: string;
  type: string;
  nullPct: number;
  distinct?: number;
  mean?: number;
  std?: number;
  p01?: number;
  p50?: number;
  p99?: number;
  min?: number | string;
  max?: number | string;
}

/** A pre-binned distribution for one numeric column. */
export interface ColumnHistogram {
  column: string;
  bins: { start: number; end: number; count: number }[];
}

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
  schemaFields: SchemaField[];
  // a small, clearly-labeled SAMPLE (sample · N of M rows) — keyed by the
  // dataset's own schemaFields, never implying the full table.
  sampleRows?: Record<string, unknown>[];
  columnStats?: ColumnStat[]; // pre-computed snapshot
  histograms?: ColumnHistogram[]; // pre-binned distributions
}

export interface Workspace {
  id: string; // slug, e.g. "crude-oil-research"
  name: string;
  summary: string;
  updatedAt: string;
  recentlyActive?: boolean;
  starred?: boolean;
  lineage: LineageSubgraph; // drives the card thumbnail
}

/** A single ⌘K search result, across workspaces / artifacts / datasets. */
export interface SearchHit {
  type: "workspace" | "artifact" | "dataset";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** What a kind *is*, in context — drives the Concepts lens. Generic per-kind
 *  text the lens specialises with the focused artifact (label/op). */
export interface Concept {
  what: string; // "a feature is a computed signal …"
  why: string; // why it exists in the graph
}

export type NextAction =
  | { type: "push_node"; ref: string }
  | { type: "open_catalog"; filter?: Record<string, unknown> }
  | { type: "chip"; label: string; prompt: string };

export type StepStatus = "pending" | "running" | "done";

/** A plan surfaced in the conversation: the decomposed steps as a ticking
 *  checklist that doubles as the meter (steps + credits). */
export interface PlanView {
  steps: { id: string; label: string; op?: string; credits: number; status: StepStatus }[];
  credits: number;
  awaitingApproval: boolean; // big builds wait for an explicit "build →"
  horizonYears?: number; // the eval horizon, when scaled (>1)
  scopeOptions?: number[]; // horizons the user can scope down to before approving
}

export interface Turn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  actions?: NextAction[];
  plan?: PlanView; // present on the assistant turn that proposes/streams a build
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
  // what this step materialises onto the live workspace graph (undefined for
  // pure load/profile steps that don't add a new artifact):
  node?: Node;
  edges?: LineageEdge[];
  // presentational sidecars for the produced node:
  nodeLabel?: string; // human label
  // a result step also carries a spec so the Result face can render it:
  resultSpec?: ResultSpec;
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

/* ── Variations / forking ──────────────────────────────────────────
   A variant group is a set of sibling artifacts that differ in ONE typed
   parameter (the operator's knob). The graph draws ONE node with a `⑂×N`
   badge; expanding opens a comparison. The cross-product is never drawn. */
export interface VariantMember {
  value: string; // the knob value, e.g. "0.10"
  metrics?: Record<string, number>; // present when the sweep produces results
}
export interface VariantGroup {
  param: string; // human knob name, e.g. "α", "window", "horizon"
  knob: string[]; // the typed options the fork dialog offers
  chosen: string; // the canonical value currently on the spine
  members: VariantMember[];
  bestBy?: string; // metric key the "best" is chosen by (e.g. "sharpe")
}
