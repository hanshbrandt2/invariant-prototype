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
  /** Authored equity snapshot (cumulative return %) over the eval window — the
   *  real series the result leads with. Honest like the sampleRows/histograms:
   *  fixed + labeled, never synthesized at render time. Drawdown is DERIVED from
   *  it (equity − running max), so the two-panel figure is internally consistent. */
  equitySeries?: { t: string; equity: number }[];
  /** Authored regime snapshot aligned to the eval window — which market regime
   *  ruled each step (UP / DOWN / MR / NO_TRADE). The regime ribbon reads it. */
  regimeSeries?: { t: string; state: string }[];
  /** Authored signal snapshot (the 20-day z-score) aligned to the eval window —
   *  the "signal space" a return point dives into. */
  signalSeries?: { t: string; z: number }[];
  /** Authored spread snapshot (the crude–gas spread) aligned to the eval window —
   *  the space UNDERNEATH the signal: the z-score is just this, standardized. */
  spreadSeries?: { t: string; spread: number }[];
  /** Authored raw-bar sample (WTI front-month, 1-minute OHLC) — the FLOOR of the
   *  dive: the source the spread, and everything above it, is built from. */
  rawCandles?: { t: string; o: number; h: number; l: number; c: number }[];
}

/* ── Figures (M-J) ─────────────────────────────────────────────────
   A ChartSpec is a declarative, renderer-agnostic figure — a deliberate SUBSET
   of viz-engine's ViewSpec (mark + encodings + title-as-finding + a data
   binding). Today <Figure> renders it via Recharts; when @invariant/viz lands,
   its compiler renders the SAME spec behind the unchanged seam. In the prototype
   the binding is an inline authored snapshot (the stand-in for a query/dataRef) —
   honest because it's fixed and labeled, never fabricated at render time. */
export type FigureMark = "line" | "area" | "bar" | "equity-drawdown" | "equity-hero" | "signal" | "spread" | "candles" | "heatmap" | "regime" | "weights";
export interface FigurePoint {
  [key: string]: number | string;
}
export interface ChartSpec {
  mark: FigureMark;
  data: FigurePoint[]; // authored snapshot rows (prototype stand-in for a dataRef)
  x: string; // x encoding key
  y: string | string[]; // y encoding key(s)
  title?: string; // the finding (title-as-finding), serif
  caption?: string; // mono sub-caption — units · window · tz
  yLabel?: string;
  color?: string; // series color (hex); default data-blue
  colors?: string[]; // per-row color (bar mark) — e.g. winner in clay
  focus?: number; // a focused index (the dived point) for marks that highlight a window
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

/* ─────────────────────────────────────────────────────────────────
   The contract layer — invariants ("pins"), vintages, consequences,
   and the single validator object. These mirror real backend
   mechanisms (the ADR refs) the way the rest of this file mirrors the
   artifact-catalog: shapes a live backend can fill, mocked now.
   ───────────────────────────────────────────────────────────────── */

/** A pin's enforcement state on the contract rail.
 *  structural = axiom, locked on · active = in force, togglable ·
 *  off = available, pinnable · designed = roadmap, never pinnable. */
export type PinState = "structural" | "active" | "off" | "designed";

/** What kind of law a pin is (drives grouping + the drawer copy). */
export type PinKind = "structural" | "invariant" | "policy" | "designed";

/** One law on the contract rail — an invariant every build on this canvas must
 *  satisfy. Each maps to a real backend mechanism (the `adr` + `mechanism`). */
export interface Pin {
  id: string; // stable slug, e.g. "no_lookahead"
  label: string; // "No look-ahead"
  state: PinState;
  kind: PinKind;
  adr?: string; // governing decision record, e.g. "ADR-0033"
  holds: string; // plain-language "what it holds"
  enforce: string; // "how it's held" — the mechanism in prose
  gates: string[]; // the gate chips, e.g. ["P1","P2","P3"] | ["hash"] | ["policy"]
  scope: string; // where it applies
  mechanism: string; // the actual operator / expression (rendered mono)
  cantProve: string; // honest limit — "what this can't prove"
  policyRef?: string; // policy node id, when kind === "policy"
  intendedInvariant?: string; // the policy's plain-language invariant
  locked?: boolean; // structural pins can't be toggled
}

/** A revision-bearing figure observed at a knowledge date — what the As-of
 *  pin's vintage slider moves over. `moved` = differs from the live value;
 *  `fencedOut` = dated after the pinned as-of (would be vintage leakage). */
export interface Vintage {
  asOf: string; // knowledge date (ISO)
  value: number;
  note?: string;
  moved?: boolean;
  fencedOut?: boolean;
}

/** A live readout of what the pinned laws DO to a build. `blocked` = the law
 *  forbids something; `required` = the law forces something. */
export interface Consequence {
  kind: "blocked" | "required";
  text: string;
  dependsOnPin?: string; // pin id; undefined = always in force (structural)
}

export type Verdict = "pass" | "fail";

/** The ONE validator object per artifact, rendered at three zooms (chat dot,
 *  canvas glyph, inspector breakdown). P1/P2/P3 are the adaptedness gates
 *  (no-lookahead falsification); `reproducible` is the lineage-hash pin. */
export interface Validator {
  p1: Verdict; // inputs adapted — only past information enters the decision
  p2: Verdict; // target strictly future (lead), no overlap with the inputs
  p3: Verdict; // forward-reach falsification scan found no leak
  reproducible: boolean; // lineage_hash + producer_code_hash pinned
  lineageHash?: string;
  violatedPin?: string; // the pin id a red facet maps to
}

/** The bounded, ordered pipeline stages — the canvas's horizontal axis.
 *  `analysis` is designed-not-built (ADR-0037): rendered faded, never filled. */
export type CanvasStage =
  | "dataset"
  | "feature"
  | "matrix"
  | "target"
  | "model"
  | "result"
  | "analysis";

export const STAGE_LANES: CanvasStage[] = ["dataset", "feature", "matrix", "target", "model", "result", "analysis"];

/** Which lane a node kind locks to. Policies / operators are governance and
 *  definitions — not flow nodes — so they have no lane (rendered as pins and
 *  badges, never as stage cards). */
export const STAGE_OF_KIND: Partial<Record<NodeKind, CanvasStage>> = {
  dataset: "dataset",
  "raw-dataset": "dataset",
  universe: "dataset",
  feature: "feature",
  matrix: "matrix",
  target: "target",
  model: "model",
  strategy: "model",
  result: "result",
  figure: "result",
};

/** A parameter sweep: N sibling artifacts differing in ONE knob, each fully
 *  materialised (own id + lineage_hash + validator), stacked in one lane so
 *  the comparison is honestly like-for-like under the same pinned contract. */
export interface SweepResult {
  node: Node;
  edges: LineageEdge[];
  value: string; // the knob value, e.g. "40"
  metrics: Record<string, number>;
  validator: Validator;
}
export interface Sweep {
  baseId: string; // the canonical sibling currently on the spine
  param: string; // human knob name, e.g. "window"
  op: string; // the operator swept, e.g. "rolling_zscore"
  results: SweepResult[]; // includes the base; siblings stack downward
}

/* ─────────────────────────────────────────────────────────────────
   Recipes & the manual → agentic promotion.
   A Recipe is a validated, parameterised workflow crystallised from a
   workspace (its DAG + the knobs that may vary + the pins it must obey).
   "Agentic" = the agent may RUN that recipe on its own, but only ever
   INSIDE the pinned invariants — a violation halts the run.
   ───────────────────────────────────────────────────────────────── */

/** One degree of freedom the agent is allowed to vary (a typed operator knob). */
export interface RecipeKnob {
  param: string; // human knob name, e.g. "z-window"
  current: string; // the value on the spine
  options: string[];
  op?: string; // the operator it belongs to
}

/** When promoted to agentic: what the agent may vary, when it runs, the cap. */
export interface AgenticConfig {
  scope: ("new_data" | "param_sweep" | "universe")[];
  trigger: "on_demand" | "weekly" | "on_new_data";
  triggerNote?: string; // e.g. "Mon 06:00"
  budget: number; // credits / run
  enabledAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  summary: string;
  workspaceId?: string; // where it was crystallised from
  lineage: LineageSubgraph; // the DAG (drives the mini thumbnail)
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  knobs: RecipeKnob[];
  pins: string[]; // pin ids in force — the guardrails that travel with it
  state: "draft" | "validated";
  agentic?: AgenticConfig; // present once promoted
  producedId: string; // the terminal result
  metrics?: Record<string, number>; // the headline finding
  createdAt: string;
}

/** One run of a recipe — the audit log. Each run is a reproducible attempt:
 *  a `lineageHash` if it validated, the pin it tripped if it `halted`. The Runs
 *  history is this list, newest first; the halted ones are the proof the
 *  guardrail fires on its own, not just in a demo. */
export interface RecipeRun {
  id: string;
  recipeId: string;
  at: string; // ISO timestamp
  trigger: "weekly" | "on_new_data" | "on_demand" | "manual";
  scope: string; // what varied this run, e.g. "2025-Q1 data"
  outcome: "validated" | "halted";
  lineageHash?: string; // present when validated — the reproducible fingerprint
  violatedPin?: string; // present when halted — the pin id it tripped
  metrics?: Record<string, number>; // the headline finding, when validated
  credits: number;
  note?: string;
}

/** One file in the workspace's reproducible code project (the Code view). Each
 *  artifact is a file under its stage folder; `nodeId` links it back to the
 *  graph node so canvas ⟷ file selection stays in sync. */
/** The task-apt mini-visual a finding card leads with (not a sparkline — a
 *  categorical/distribution picture that fits the research task). */
export type FindingViz =
  | { type: "bars"; bars: { label: string; pct: number; tone?: string }[] } // weights / risk contributions
  | { type: "waterfall"; steps: { label: string; value: number }[] } // attribution
  | { type: "histogram"; bins: number[] }; // EDA distribution

/** A published finding — a result pinned read-only & sealed, with the proof that
 *  travels with it. The registry behind publish-a-finding. */
export interface PublishedFinding {
  id: string; // `finding:<resultId>`
  resultId: string;
  workspaceId: string;
  workspaceName: string;
  friendlyName: string;
  metrics: Record<string, number>;
  lineageHash?: string;
  asOf?: string; // knowledge time
  publishedBy?: string;
  publishedAt?: string; // ISO date the finding was pinned
  sealOk: boolean;
  // what kind of research, so the card leads with the right sentence + picture
  kind?: "strategy" | "portfolio" | "risk" | "attribution" | "eda";
  headline?: string; // the plain-language one-liner
  viz?: FindingViz; // the task-apt visual (strategy leads with its numbers)
  stats?: { label: string; value: string }[]; // pre-formatted key numbers ($/%/×)
  live?: boolean; // backed by a real workspace (openable) vs an illustrative seed
}

export interface ProjectFile {
  path: string; // "invariant_research/features.py"
  folder: string; // "invariant_research" ("" for project root)
  name: string; // "features.py"
  lang: "python" | "yaml" | "text";
  code: string;
  nodeId?: string; // the single artifact this file is (when 1:1, e.g. a result spec)
  nodeIds?: string[]; // every artifact whose code lives in this module (grouped modules)
}

/** The simulated agentic run — streams like a build, but can HALT when an
 *  artifact would violate a pinned invariant (the trust moment). */
export type AgenticEvent =
  | { type: "thinking"; text: string }
  | { type: "step_start"; step: BuildStep; index: number; total: number }
  | { type: "step_done"; step: BuildStep; index: number; total: number }
  | { type: "halt"; step: BuildStep; pinId: string; reason: string }
  | { type: "done"; producedId: string };
