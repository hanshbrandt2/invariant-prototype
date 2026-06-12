# Migrating Invariant to the real backend

**TL;DR.** The frontend was built to transplant: everything reads through `lib/data`
(reads) and `lib/sim` (the build/chat stream), and the types in `lib/types` *are*
the contract. Most of the backend already exists as four Python services. The
migration is (1) a thin **BFF** that maps each Python service's shapes to our
TypeScript contract and holds auth, (2) flipping `NEXT_PUBLIC_DATA_SOURCE=api`,
sequenced **by service-readiness × frontend-value**. Components never change.

This complements `docs/BACKEND_CONTRACT.md` (the exact `lib/data` interface) — that
doc is the *what*; this is the *how* and the *order*, plus the gaps Phase 3 opened.

---

## 1 · What already exists (and what each maps to)

| Backend service | What it is | Frontend seam it satisfies |
|---|---|---|
| **artifact-catalog** (FastAPI + Postgres + alembic; Python client) | Artifact lifecycle (`scratch→saved→live→deployed`), state transitions, **lineage walk**, content/lineage hashes, recompute-on-arrival | `getNode` · `listArtifacts` · `getLineageSubgraph` · `getResultSpec` · `getVariants` · `listWorkspaces`/`getWorkspace` · publish/promote (lifecycle) — i.e. `NodeSource: 'artifact-catalog'` |
| **data-catalog** (FastAPI + Postgres; Python client) | *Definitions* of raw market data — what exists, schema, validation — **not the values** | `listHostedDatasets` · `getHostedDataset` (schema/roles) — `NodeSource: 'data-catalog'` |
| **dsl-engine** (*skeleton*) | DSL validator, Tier-1 operator library, **executor**, `stitch_contracts`, **codegen** (Python) | `lib/sim` `estimateBuild`/`runBuild` (the build stream) · `getCodeMap` (reproducible Python) · operator validity |
| **agent-runtime** (FastAPI + alembic; chat API; loads each repo's `agent_tools` as plugins) | The agent that **plans + orchestrates** a build by calling the other services' tools; persists conversations | `getConversation`/`getGreeting` · `narrate` (assistant turns) · `runAgentic` (agentic re-run) · the "ask → it builds" loop |
| **agent-platform** | The LLM framework agent-runtime runs on (ChatProvider, memory) | — (indirect) |

The mapping is close to 1:1 because `lib/types` was derived from these contracts.
`NodeSource` literally enumerates the services.

**Readiness signal:** artifact-catalog, data-catalog, agent-runtime are real
FastAPI services; **dsl-engine is a skeleton.** So the *read path* and *chat* can
go first; the *build stream* waits on (or stubs) the executor.

---

## 2 · The architecture: a BFF, not direct calls

Put a **Backend-for-Frontend** between Next and the Python services. Recommended
form: **Next Route Handlers** (`app/api/*`) + a server-only `lib/api/` mapping
module.

```
 browser ──► Next (SSR server components)        ─► lib/data ─► lib/api/* ─► [Python services]
         └─► Next Route Handlers (app/api/*)  ◄──┘  (client calls + streams)   (server-side, holds auth)
```

Why this shape:
- **No secrets in the frontend** (the cardinal constraint). Service URLs + the
  Cognito/Auth0 session live server-side in the route handlers / server components.
- **The contract mapping lives in one place** (`lib/api/`): Python response →
  `lib/types` shape. `lib/data`'s `api` branch and the route handlers both call it.
- **Server-component reads** (the dashboard, workspace, inspector pages are async
  RSCs already) can call `lib/api/` **directly server-side** — no round-trip
  through a route handler. Only **client calls + streams** need the route handler.
- **Streaming just proxies**: a route handler pipes dsl-engine/agent-runtime's
  SSE/chunked stream straight to the browser as `BuildEvent`s.
- One deploy to start; if scale demands, extract `lib/api/` into a dedicated Python
  gateway later (it could reuse the existing `*_client` packages) **without touching
  components**.

What you do *not* do: call the Python services from client components (CORS +
token exposure), or let components import anything but `lib/data` (lint-guarded).

---

## 3 · Step 0 — contract reconciliation (do this first, it's cheap)

Before any wiring, diff each `lib/types` shape against the service's actual
response (OpenAPI / the Python client models). Produce a mapping table per getter.
Expected small deltas to resolve:
- `Node.description` is marked *"backend add; mock it now"* — confirm the field.
- `ResultSpec` carries authored `equitySeries/signalSeries/spreadSeries/rawCandles`
  for the dive — **decide where these come from** (see §5, gap A).
- `LineageEdge.kind` values vs artifact-catalog's edge taxonomy.
- `LifecycleState` ↔ artifact-catalog's states (should match exactly).
- `ChartSpec` is a frontend concept — decide if the BFF emits it or the frontend
  builds it from the result artifact (recommend: frontend keeps `lib/figures`).

Output: a short `lib/api/MAPPING.md`. Where a field genuinely doesn't exist yet,
that's a **backend ticket**, not a frontend hack — keep the honesty bar.

---

## 4 · The sequence (readiness × value)

Each phase flips a subset of `lib/data` to `api` and is independently shippable
(mix fixtures + api per-getter during the transition).

1. **Read path — the catalog & lineage** *(artifact-catalog + data-catalog, both real)*.
   Implement `api` for `listHostedDatasets`/`getHostedDataset`, `listWorkspaces`/
   `getWorkspace`, `getNode`/`listArtifacts`, `getLineageSubgraph`,
   `getGraphPresentation`, `getResultSpec`. Lights up the **dashboard, inspector,
   graph lens, and the read-only finding** against real artifacts. Lowest risk,
   no streaming, no auth-write. *Acceptance:* open a real workspace, every node/
   hash/lineage edge is live; the contract checks in §3 hold.
2. **Chat & conversation** *(agent-runtime, real — agent-chat-ui already consumes it)*.
   Wire `getConversation`/`getGreeting`/`narrate` to the chat API. The assistant's
   `push_node`/`chip` actions map to real artifact refs. *Acceptance:* the
   conversation replays a real session; chips drive the canvas.
3. **Build stream** *(agent-runtime plans → dsl-engine executes; the hard one)*.
   `estimateBuild` → the agent decomposes the prompt into a plan (credits/steps).
   `runBuild` → a route handler proxies the executor's streamed steps as
   `BuildEvent`s; each `step_done` carries the materialised `Node`+edges from
   artifact-catalog. `getCodeMap` → dsl-engine codegen. **Gated on dsl-engine**;
   until it matures, stub the executor (agent plans, stub runs, artifact-catalog
   stores). `runAgentic` + the **HALT-on-violated-pin** map to the validator.
4. **Writes, lifecycle & auth**. `publishFinding` → artifact-catalog `saved→live`;
   promote → a saved recipe/workflow. Swap simulated login for **Cognito/Auth0**
   behind the BFF — `requireAuth` action-gating mechanics are unchanged. Replace
   the fake credit counter with real metering (executor compute cost).
5. **Sessions & pinboard** *(new — see gap B)*. Move `loadSession`/`saveSession`/
   `clearSession` from localStorage to a sessions service; pins ride with the tree.
6. **Drill-to-raw over real data** *(see gap A)*. Replace the authored
   `equity/signal/spread/raw` snapshots with a real query layer, so any point
   traces to actual ticks, not a pre-authored stand-in.

---

## 5 · The gaps Phase 3 opened (don't let them surprise the migration)

**A · The figure series & drill-to-raw.** Today `ResultSpec` carries authored
`equitySeries/signalSeries/spreadSeries/rawCandles`, and `drillUnderneath` walks
them. Real version: the **executor** produces the result + its evaluation series
(stored on/with the result artifact); drill-to-raw needs a **query layer over the
raw values** — and note data-catalog holds *definitions, not values*, so values
live in object storage / the executor's data access (DuckDB/Mosaic is the eventual
fit, per the design principles). This is the single biggest "later." Until then,
keep serving authored snapshots, labeled — the `<Figure>`/`drillUnderneath` seam
doesn't change.

**B · Sessions & the pinboard have no backend yet.** The session **tree** (continue/
fork/dive/pins) currently persists to `localStorage` (`lib/session-store.ts`) — the
one piece *not* behind a `lib/data` contract. A session is a **navigable conversation
tree**, so the natural home is **agent-runtime** (it already persists conversations
in Postgres) — extend it with a session-tree + pins table, or stand up a small
`sessions` service. Add `getSession`/`saveSession` to `docs/BACKEND_CONTRACT.md`.
Until then localStorage is the honest stand-in (single-device, no as-of freeze).

**C · `ChartSpec` ownership.** Keep `lib/figures` building `ChartSpec`s on the
frontend from the result artifact's series; don't push chart layout into the
backend. The backend owns *data*, the frontend owns *figures*.

**D · Credits / budget.** Simulated. Real metering comes from the executor's
per-build cost; the budget-as-bound UI (`~N questions`) just reads the real balance.

---

## 6 · Deploy (unchanged from M-H)
`next build` → static `/`,`/learn`,`/community`,`/settings`; SSR-on-demand for
`/dashboard`,`/workspace/[id]`. Host on Amplify / `next start` on ECS/Fargate /
OpenNext→CloudFront+Lambda. Env: `NEXT_PUBLIC_DATA_SOURCE`,
`NEXT_PUBLIC_API_BASE_URL` (+ server-only service URLs/secrets for the BFF). Auth at
the BFF, never the browser.

## 7 · First concrete move
Stand up `lib/api/` + `app/api/[...]` for **Phase 1 read-path only**, against
artifact-catalog + data-catalog, behind `NEXT_PUBLIC_DATA_SOURCE=api`. It's the
cheapest end-to-end proof that the seam holds — one workspace, real artifacts, zero
component changes — and it de-risks everything after it.
