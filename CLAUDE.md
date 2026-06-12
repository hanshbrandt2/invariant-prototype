# CLAUDE.md — Invariant frontend prototype

## What this is
A **frontend-only** prototype of the Invariant workspace — *Lovable, but for quantitative research*. Next.js + TypeScript + Tailwind. Fake data, no backend, no auth. Goal: get the UX exactly right before wiring the (already-mostly-built) backend. Built to **transplant** behind one data seam, not throwaway.

The product is a long-running **research session** (ADR-0001): you ask a question, it builds a *figure that is the answer*, you fall through any number to the raw tick, you fork freely and pin the memo. The honesty machinery (lineage, no-lookahead, reproducibility) is the **engine underneath**, surfaced on demand — not the pitch.

**Orient yourself here first:**
- `docs/ROADMAP.md` — the anti-drift anchor. Every change maps to a milestone. **Phase 1 (M-A…M-H) + Phase 2 (M-I…M-N) + Phase 3 (M-O…M-T) are DONE.** Don't add scope without adding it here.
- `docs/adr/0001-the-research-session.md` — the binding design decisions (tree-not-stack, contract-as-engine, drill-to-raw, pinboard, budget-as-bound).
- `docs/agentic-analytics-ui-design-principles.md` — the interaction principles.
- `docs/BACKEND_CONTRACT.md` — the `lib/data` interface a real backend must satisfy.

## The cardinal rule
**Fake data is typed to the real backend contracts.** Swapping to the backend is a data-source change behind one seam, not a rewrite. Never invent data shapes — use the types in `lib/types/index.ts` (the contract). The **honesty bar is hard**: never show a capability the real backend can't do; every mock is labeled (`sample · N of M`, `pre-computed snapshot · as of <date>`); charts bind to authored snapshot data, never a synthesized series.

## Stack
- Next.js 16 (app router, Turbopack), React 19, **mostly client components**. Don't lean on server actions that assume a backend; the one server-fetch seam is `lib/data`.
- TypeScript, `strict`.
- Tailwind v4 (`@theme` tokens in `app/globals.css`) + **custom editorial components** (no shadcn/`components/ui`).
- Recharts for the Recharts-based marks; bespoke SVG for the dive-chart family. One `<Figure spec={ChartSpec}>` renderer seam (`components/workspace/figure.tsx`).
- Login + credits are **simulated** (`components/auth`, `components/app/credits-context`, localStorage).

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
  source: NodeSource; kind: NodeKind; name: string; version?: string;
  state?: LifecycleState; description?: string;
  contentHash?: string; lineageHash?: string; producerCodeHash?: string;
  spec: unknown;              // typed per kind (4 kinds typed; rest free-form)
  policyRefs?: string[];      // row-level governance — `policy:<name>:v<n>`
  nextProposal?: NextProposal;                            // result only
  pitConstruction?: 'point_in_time' | 'current_snapshot'; // universe only
  asOfKnowledgeTime?: string; createdAt?: string;
}
export interface ResultSpec {
  name: string; friendlyName: string; intendedInvariant: string;
  strategyId: string; evalWindow: { start: string; end: string };
  metrics: Record<string, number>; lineageRefs: string[]; nextProposal?: NextProposal;
  // authored snapshots that power the dive (drill-to-raw); honest, labeled:
  equitySeries?; regimeSeries?; signalSeries?; spreadSeries?; rawCandles?;
}
export interface LineageEdge { childId; parentId; kind: 'input_dependency' | 'training_data' | 'input_model' | 'stitch_source' | 'presentation_source'; }

// Phase 3 — the research session (ADR-0001). ONE tree powers the macro session
// AND the micro dive. continue = a child; fork = a sibling (non-destructive).
export type DiveSpace = 'return' | 'signal' | 'spread' | 'raw';
export interface SessionNode { id; parentId: string | null; actor: 'user'|'agent';
  delta; query; scope: ScopeQuery; view: { lens; focusNodeId?; dive?: {space:DiveSpace;index} };
  createdAt; pinned?; annotation?; }      // pinned nodes = the pinboard deliverable
export interface SessionTree { rootId; currentId; nodes: Record<string, SessionNode>; }
```

**`lib/data/index.ts`** — the **only** place that knows where data comes from. Fixtures now, `fetch()` later: `DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE`; each getter becomes a 2-line dispatch (see `docs/BACKEND_CONTRACT.md`). Getters: `getNode` · `listArtifacts` · `getLineageSubgraph` · `getGraphPresentation` · `listHostedDatasets`/`getHostedDataset` · `listWorkspaces`/`getWorkspace` · `getConversation`/`getGreeting` · `getResultSpec` · `getConcepts` · `getVariants` · `getCodeMap` · `searchCatalog` · `listStarterPrompts` · `deriveValidator`/`validatorOk` · `publishFinding`/`loadLocalFindings` · `loadSession`/`saveSession`/`clearSession`. **Components never import fixtures or call `fetch` — only `lib/data` (lint-guarded by `check:seams`).** Pure helpers (`lib/session-tree`, `lib/figures`, `lib/theme`, `lib/validator`) may be imported directly.

**`lib/sim/`** — the streaming backend, simulated (treat it as the spec for the real one): `estimateBuild` (accretive plan + credits + `big` gate + scope-down) → `runBuild` yields `BuildEvent`s (`step_start`/`step_done`/`done`, each carrying the `Node`+`LineageEdge[]` to materialise) → the canvas grows node-by-node. Plus `narrate` (the scripted assistant turns) and `runAgentic` (an agentic re-run that streams steps and HALTS on a violated pin).

**`lib/session-tree.ts` + `lib/session-store.ts`** — the session model (M-P): pure immutable tree ops + localStorage persistence (`invariant.session:{workspaceId}`). **This is the one piece NOT yet behind a real-backend contract** — sessions/pins live in localStorage; the backend needs a sessions service (see migration plan). `lib/figures.ts` builds `ChartSpec`s from authored snapshots and owns `drillUnderneath` (the dive resolver).

**`lib/fixtures/`** — the connected crude-oil-research graph (contract-accurate): `crude_oil_1m` (raw) → `front_month_cont` → `front_month_ret`/`zscore_20`/… → `signal_matrix_v3` (matrix) → `fwd_ret_5m` (target) → `linreg_baseline` (model) → `bt_2024_06_meanrev` (result); policy `roll:wti:v3`. Hosted: `nasdaq-large-cap`, `crude_oil_1m`, `ng_henry_hub_5m`, `fx_majors_tick`. Real operators only.

## The UI (the current model — Phase 3)
- **The conversation drives a session TREE.** Each question is a node; `continue ↳` grows the line, `fork ⑂` branches an alternative (the old line is never lost). The **session map** (bottom strip) is the navigable tree + the new meta-chrome. The **canvas is a viewport onto the current node** — travel morphs it, never teleports.
- **The visualization is the hero.** The Insight lens leads with one annotated figure; the prose is optional. **Every number drills to raw** (the dive: equity → signal → spread → raw 1-minute bars), resolver-driven (`drillUnderneath`), honest (authored snapshots; non-drillable marks are terminal).
- **The contract is the engine, not the chrome.** No persistent rail — a quiet **audit** affordance in the top bar opens the pins/validator/lineage on demand (`audit-panel.tsx`). `sealOk`/validator still gate publish and HALT the agentic run.
- **The pinboard is the deliverable.** Pin ★ a finding/node → the memo assembles itself (pins ride in the session tree). Iteration is bounded by **credits** (the budget meter), not a timer.
- **Onboarding lands in the doing.** Landing "Enter the workspace" → `/workspace/new` (the empty canvas: "What do you want to test?" + one-click prompts + data + chat). The **dashboard is the returning user's library**; newcomers see a focused start + honestly-labeled "Example sessions" (gated by `first-run-gate.tsx`).

## Visual system
Warm paper `#FAF7F1`, ink `#1C1B18`, clay `#BE4D2B` (the one action color, sparing), hairline `#E7E1D5`; data-blue `#1F4E79`, green `#3B6D11`, sage `#7A8B6F` in charts only. Source Serif 4 (titles), Inter (UI), JetBrains Mono (code/data/hashes). **One enforced text scale** (`--text-display/h1/h2/h3/body/ui/meta/micro`) — no arbitrary `text-[Xrem]` outside the allowlisted landing. Flat, editorial, FT/Economist. No gradients, no shadows on the canvas, no sparklines.

## Rules for Claude Code
- Type everything to the contracts (`lib/types`). If a shape is unclear, read the ADR/ROADMAP — don't invent.
- Components are dumb: read through `lib/data`, render, call sim/session actions. No fixture imports, no `fetch`, no store imports (use `lib/data`).
- The session is a **tree, not a stack** (continue/fork are non-destructive). The contract is the **engine**, surfaced via audit, never a rail. Trust is something you **do** (trace a number), not a hash you read.
- The canvas leads with the **visual**; earn the density (empty → one node → grow). Plain labels ("how it was built", not "show DAG"). One growing app — extend, don't regenerate.
- **Verify before claiming.** `pnpm check` = `check:typescale` + `check:charts` + `check:seams` + `check:session` (the session-tree model proven by execution via `node --experimental-strip-types`). Then `npx tsc --noEmit` + `next build`. Prove generated code runs; never just claim it.
- **Dev-server gotcha:** a long-lived `next dev` serves stale Turbopack chunks (you'll see `X is not defined` for a renamed symbol). It's almost always stale, not a real bug — confirm via SSR/`tsc`/the on-disk chunk, then `kill + rm -rf .next + restart`. Hard-reload the browser.
- Rendered mockups are first-class for design dialogue (the user prefers them) — write `docs/*-direction.html`, render with `google-chrome --headless=new --screenshot`, and screenshot to react to.

## Do not
Wire a real backend or auth into components · invent data shapes · put `fetch`/fixtures/stores in components · open the canvas on a code/metadata view · **reintroduce the contract rail** (it's the audit affordance now) · **make history a stack** (it's a tree) · surface hashes/seals by default (drill-to-raw is the trust surface) · land newcomers on the dashboard hub · touch the sibling backend repos (`../artifact-catalog`, `../dsl-engine`, etc.) — read-only.
