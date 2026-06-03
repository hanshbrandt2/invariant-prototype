# CLAUDE.md — Invariant frontend prototype

## What this is
A **frontend-only** prototype of the Invariant workspace. Next.js + TypeScript + Tailwind + shadcn/ui. Fake data, no backend, no auth. Goal: get the UX exactly right before the backend exists. Built in the same stack as the real `invariant-sandbox/web` so the components transplant later — this is not throwaway.

## The cardinal rule
**Fake data is typed to the real backend contracts.** When the backend arrives, swapping is a data-source change behind one seam, not a rewrite. Never invent data shapes — use the types below (full field lists in `docs/BUILD_SPEC_workspace_graph_inspector.md`).

## Stack
- Next.js (app router), **mostly client components**. Keep it client-side and swappable; do NOT lean on server components / server actions that assume a backend.
- TypeScript, `strict`.
- Tailwind (v4) + shadcn/ui (matches the real web package).
- Recharts for charts (matches the real package).
- No backend, no auth provider — the login + credit flow is simulated.

## Architecture seams (the part that matters)

**`lib/types/`** — interfaces mirroring the backend contracts. The spine:
```ts
export type NodeSource = 'artifact-catalog' | 'registry' | 'data-catalog';
export type ArtifactKind =
  | 'dataset' | 'feature' | 'matrix' | 'target' | 'model'
  | 'strategy' | 'user_operator' | 'policy' | 'result' | 'universe' | 'figure';
export type NodeKind = ArtifactKind | 'operator' | 'raw-dataset';
export type LifecycleState = 'scratch' | 'saved' | 'live' | 'deployed';

export interface Node {
  id: string;                 // artifacts: `${kind}:${name}:${version}`
  source: NodeSource;
  kind: NodeKind;
  name: string;
  version?: string;
  state?: LifecycleState;
  description?: string;        // human-readable (backend add; mock it now)
  contentHash?: string;
  lineageHash?: string;
  spec: unknown;               // typed per kind below
  // row-level provenance (NOT in spec):
  policyRefs?: string[];       // `policy:<name>:v<n>`
  nextProposal?: NextProposal; // result only
  pitConstruction?: 'point_in_time' | 'current_snapshot'; // universe only
  producerCodeHash?: string;
  asOfKnowledgeTime?: string;
  createdAt?: string;
}

// Only 4 kinds have a typed spec; the rest are free-form dicts.
export interface PolicySpec {
  policyClass: PolicyClass;          // 12 values, see BUILD_SPEC §A
  intendedInvariant: string;         // >= 50 chars
  scopeOfApplicability: string[];
  effectiveDateRange?: [string, string];
  supersedes?: string;
  author?: string;
  reviewStatus: 'draft' | 'reviewed' | 'approved';
}
export interface ResultSpec {
  name: string; friendlyName: string; intendedInvariant: string;
  strategyId: string; evalWindow: { start: string; end: string };
  metrics: Record<string, number>; lineageRefs: string[];
  nextProposal?: NextProposal;
}
export type NextProposal =
  | { kind: 'feature_modification' | 'policy_swap' | 'retrain' | 'universe_change'; /* fields */ }
  | { kind: 'none'; reason: string /* >= 20 chars */ };
// FittedModelSpec, UniverseSpec, OperatorDef, LineageEdge, ChartSpec: see BUILD_SPEC.

export interface LineageEdge {
  childId: string; parentId: string;
  kind: 'input_dependency' | 'training_data' | 'input_model' | 'stitch_source' | 'presentation_source';
}
export interface ToolResultEnvelope<T> { data: T; displayHint: string; nextActions: NextAction[]; }
export type NextAction =
  | { type: 'push_node'; ref: string }
  | { type: 'open_catalog'; filter?: Record<string, unknown> }
  | { type: 'chip'; label: string; prompt: string };
```

**`lib/data/`** — the only place that knows where data comes from. A single interface, fixtures-backed now, `fetch()`-backed later:
```ts
getNode(id): Promise<Node>
listArtifacts(filter?): Promise<Node[]>
getLineageSubgraph(id, { depth?, direction? }): Promise<{ nodes: Node[]; edges: LineageEdge[] }>
getConversation(id): Promise<Turn[]>
runBuild(request): AsyncIterable<BuildEvent>   // streams steps (see sim)
estimateBuild(request): Promise<{ steps: number; credits: number; etaSec: number }>
```
**Components never import fixtures or call `fetch` directly — only `lib/data`.**

**`lib/fixtures/`** — a **connected** crude-oil-research graph, contract-accurate, not isolated cards:
`crude_oil_1m` (dataset, raw) → `front_month_cont` (feature) → `front_month_ret`, `carry_5d`, `zscore_20` (features) → `signal_matrix_v3` (matrix) → `fwd_ret_5m` (target) → `linreg_baseline` (model) → `bt_2024_06_meanrev` (result); policy `roll:wti:v3`; operators `stitch_contracts`, `log_returns`, `rolling_zscore`, `build_signal_matrix`, `term_carry`, `fit_model`. Hosted datasets: `nasdaq-large-cap`, `crude_oil_1m`, `ng_henry_hub_5m`, `fx_majors_tick`. Real numbers.

**`lib/sim/`** — the layer that makes it feel alive (treat exactly like a streaming backend):
- `runBuild` yields `BuildEvent`s (`step_start`, `step_done`, `done`) with realistic delays — the canvas "watch it build" + the task-list meter read this.
- a scripted assistant that returns canned turns and emits `push_node` / `open_catalog` actions so the conversation drives the canvas.
- a fake credit counter that decrements per build; `estimateBuild` returns step/credit/eta so big builds show the estimate+confirm gate.

## The UI to build
Follow `docs/invariant_platform_build_brief_figma.md` and `docs/BUILD_SPEC_workspace_graph_inspector.md` (drop both in `docs/`). In one line: empty→rich arc (hosted data → compose → login-at-build → auto-build → canvas alive), one switchable canvas + always-on conversation, the polymorphic kind-aware **inspector** (faces-by-kind registry), **lineage as a full-canvas hero**, the credit estimate/meter in the workspace.

## Visual system
Warm paper `#FAF7F1`, ink `#1C1B18`, clay `#BE4D2B` (sparing), hairlines `#E7E1D5`. Source Serif 4 (titles), Inter (UI), JetBrains Mono (code/data/hashes). Flat, editorial, FT/Economist. No gradients/shadows.

## Rules for Claude Code
- Type everything to the contracts; if a shape is unclear, read `docs/BUILD_SPEC`, don't invent.
- Components are dumb: read through `lib/data`, render, call sim actions. No fixture imports, no `fetch`.
- Simulate the dynamics — streamed builds, scripted assistant, credit counter — so it feels live.
- The canvas leads with the **visual** (chart / table / lineage), never code-first.
- No sparklines. No AI-model picker. Earn the density (empty → one node → grow). Plain labels on actions ("how it was built", not "show DAG").
- One growing app — extend it each iteration; don't regenerate from scratch.

## Do not
Wire a real backend or auth · invent data shapes · put fetching in components · open the canvas on a code/metadata view.
