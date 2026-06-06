# Invariant — Product Roadmap

**One line:** *Lovable, but for quantitative research.* You talk to it; it builds auditable, reproducible workflows on time-series / quant-finance data; every result is traceable to code you can run yourself.

**Status:** frontend-only prototype, built to transplant to a real backend behind one seam. The eventual target is a production app on AWS — public landing → login → dashboard → user workspaces — but the work *now* is getting the UX exactly right with mock data typed to the real contracts.

This document is the **anti-drift anchor**. Every change should map to a milestone below. Don't add scope that isn't here without adding it here first.

---

## North-star principles (the guardrails)

1. **Frontend-only, contract-typed mock data.** No backend, no real auth. All data is fake but typed to the real backend contracts and read through the single `lib/data` seam, so a live backend swaps in with no component changes.
2. **Honesty bar (hard).** Never show a capability the real backend can't do. Mock data is always *labeled* (`sample · N of M`, `pre-computed snapshot · as of <date>`) and never implies a live query. Real operators only; no invented data shapes.
3. **Workflow-centric, canvas-is-hero.** The product is the *workflow* (conversation → build → graph/lenses), not a catalog browser. The canvas is the one focal surface; the chat recedes into the chrome.
4. **Editorial skin.** Warm paper / ink / clay, Source Serif 4 + Inter + JetBrains Mono, soft shadows on floating layers, rounded. No gradients, no sparklines. "Lovable meets The Economist."
5. **Production-shaped seams.** Components are dumb (read through `lib/data`, render). Keep the data layer swappable (fixtures today → `fetch()` later). One growing app — extend, never regenerate.

---

## Current state — DONE ✓

- **Three-surface arc:** public landing, simulated one-tap login modal (Google/GitHub/email), dashboard hub (My Invariant menu, Recent/All/Starred, Recents, lineage-thumbnail cards), workspace.
- **Workflow build loop:** curated operator-honest recipes (intent × dataset), accretive planner, plan surfaced in chat as a ticking checklist, cheap-auto-run / big-gate, watch-it-build node-by-node.
- **Canvas lenses (switcher):** Graph (vertical card DAG, default) · Result (finding-led narrative + chart) · Code (full reproducible Python, copy + download .py, syntax-highlighted, wraps) · Concepts.
- **Graph:** straight spine + branches via wiring channels, stage rail, hover-to-trace + select-to-persist path highlight, policy/variant badges, edge → edge inspector.
- **Inspector drawer:** kind-aware faces (registry) with Overview · Spec · Code · Lineage tabs; bespoke faces for dataset/result/feature/matrix/target/model/policy + generic; faces read the typed `node.spec` (no fabricated prose); graph stays interactive behind it.
- **Data legibility (M-A):** dataset face = Overview · Schema(roles) · Sample · Stats · Distribution; authored sampleRows/columnStats/histograms, every surface agrees, all honestly labeled (pre-computed snapshot, never live).
- **Typed spec everywhere (M-B):** 11 fixture nodes + every recipe node carry a typed `spec`; generic Spec tab (dict-table + view-recipe YAML); FeatureFace/ModelFace/PolicyFace read the spec (concrete windows, real fitted coefficients, real policy invariant).
- **Workbench inspector (M-C):** non-dataset faces = Overview(+pipeline ribbon) · Spec · Contract · Checks · Code · Lineage. Contract tab (identity, provenance owner/created/knowledge-time, copyable content/lineage/producer hashes, governed-by). PipelineRibbon (inputs → operator → output[TIME] → consumers). Validation tab with checks DERIVED from the graph (inputs-resolved, lineage-pinned, spec-recorded, point-in-time, no-lookahead, policy-governed, review-approved) + upstream/downstream reach; honest `checks N/N` header badge replaces the decorative `checks ✓`.
- **Graph data-encoding (M-D):** edges styled by `edge.kind` (dash = kind) with a legend showing only kinds present; selecting a node cleaves upstream causes (dashed border) from downstream effects (clay tint) and dims the unrelated; cards show grain pill (1m) + `feeds N`; live BuildEvent stream materialises each node and pulses it (`building…`) until it settles, the chat checklist tracking the same steps.
- **Credits + export (M-E):** Export menu (project `.py` reproducible script + conversation `.md` round-trip to disk; Push-to-GitHub honestly stubbed); interactive scope-down in the estimate gate (eval-horizon chips re-estimate live, e.g. 10y→3y drops 46.3→16.9 cr); data-volume credit factor (bigger datasets cost more); balance co-located with the ticking meter.
- **Production surfaces (M-F):** action-scoped login-at-build (browse free; a build holds at the gate and replays on login; `?demo=1` dev-only); bring-your-own-data upload that parses + profiles a CSV client-side (schema + sample); ⌘K command palette searching workspaces/artifacts/datasets through the seam; Account/Settings page; single `lib/data` source seam (`NEXT_PUBLIC_DATA_SOURCE`) with the component layer audited clean of fixture imports / `fetch`.
- **Polish (M-G):** funnel stubs (Learn / Community) that always end in a task-scoped "start here", wired into the landing nav + sidebar; route-level loading skeleton, error boundary, and 404; a11y (keyboard focus-visible rings, skip-to-content, aria-busy, reduced-motion); responsive collapse of rail/chat/canvas; clean production build (7 routes, static + SSR).
- **AWS-readiness (M-H):** `.env.example` (`NEXT_PUBLIC_DATA_SOURCE`, `NEXT_PUBLIC_API_BASE_URL`); verified `next build` (static prerender + SSR-on-demand); the fixtures↔API toggle wired to env; `docs/BACKEND_CONTRACT.md` documenting the exact `lib/data` interface, the build-stream spec, the hard invariants, and the AWS deploy shape — the swap is one seam.
- **Forking / variations:** `⑂×N` badges → Compare leaderboard (overlay + table) → promote-to-spine; fork dialog over typed knobs.
- **Modern shell:** slim icon rail, recessive chat panel, white framed canvas hero on a warm backdrop, segmented lens control (Graph first).
- **Deep-links** for lens/focus/inspect/compare/fork/drawertab (dev + reusable).

---

## The roadmap (sequenced; each milestone has a Definition of Done)

Milestones are ordered by impact × dependency. **M-A and M-B are the headline gap** (the investigation: *"the data is invisible; faces invent prose instead of reading the spec"*). Later milestones make it production-shaped.

### M-A · Data legibility — make the data visible (the #1 gap) — DONE ✓
Convert already-real metadata + a small set of clearly-labeled authored fixtures into legible data surfaces. Editorial tables, no ag-grid.
- **A1 — Foundations.** `lib/format.ts` (`fmtNumber` magnitude buckets, `fmtCell(value,dtype)`, em-dash nulls); inspector primitives `Field / MonoField / TagList / Section` with hide-when-empty.
- **A2 — Honest Schema table.** Extend `schemaField` → `{ name, type, nullable?, role?: 'time'|'key'|'value', note? }`. Render the Schema tab as a dtype/role-aware table: `TIME` chip on `ts_event`, `KEY` chip on `symbol`, nullable column, caption *"indexed on ts_event · keyed by symbol · N columns"*.
- **A3 — Kill the fake OHLCV Table.** Drop the `c*0.999` fabrication. Add authored `sampleRows` keyed by the dataset's own `schemaFields` (self-consistent OHLC, a null or two), render via `fmtCell`, caption *"sample · 12 of 3.81M rows"*. Table agrees with Schema.
- **A4 — Per-column stats.** Add authored `columnStats[]` (`dtype · null% · distinct · mean · std · p01/p50/p99 · min/max`, internally consistent) → editorial stats table, null% gently red-tinted, click-to-sort by null%, provenance caption.
- **A5 — Distribution histograms.** Authored `histogram.bins[]` per numeric column → editorial Recharts bars (ink/clay) + column-chip selector; one histogram on FeatureFace/TargetFace beside the line.
- **DoD:** dataset face = Overview · Schema(roles) · Sample · Stats · Distribution; every surface agrees, is labeled, and is honest (pre-computed snapshot, never live).

### M-B · Typed spec everywhere — stop fabricating prose — DONE ✓
- **B1 — Populate spec fixtures.** `PolicySpec`, per-operator `OperatorDef` params, `FittedModelSpec` coefficients (recipes.ts / fig1-lineage.ts), per BUILD_SPEC shapes.
- **B2 — Generic Spec tab + "view recipe" YAML.** Add a `Spec` tab; a `spec-table.tsx` that walks `node.spec` (scalars inline, arrays as chips, one level nested) in the editorial skin; a YAML toggle reusing the code tokenizer.
- **B3 — Faces read the spec.** Replace `PolicyFace` POLICY_INFO, `ModelFace` hash-coefficients, `FeatureFace` regex-formulas with real `node.spec` reads.
- **DoD:** every non-dataset face has a Spec tab reading `node.spec`; no fabricated prose anywhere.

### M-C · Workbench inspector — richer faces + provenance — DONE ✓
- **C1 — Contract tab** on all faces: `kind · state · version · hash(copy) · owner · source repo · created · updated` (+ provenance strip, copyable hash chips).
- **C2 — PipelineRibbon** per node: input columns → operator → output → consumers, with PK/TIME output-schema badges.
- **C3 — Validation/Health tab** (honest checks replacing the hardcoded `checks ✓`) + upstream/downstream counts + Input/Output schema.
- **DoD:** faces read like a real workbench inspector: `Summary · Data · Spec · Code · Lineage · Contract · Validation`.

### M-D · Graph data-encoding — the hero earns its place — DONE ✓
- **D1 — Edge styling by `edge.kind`** (2–3 weights/dashes) + tiny legend.
- **D2 — Directional select:** split `relatives()` → ancestors (dashed border) vs descendants (tinted fill) — one click cleaves cause vs effect.
- **D3 — Card metadata:** grain pill (1m/1d), faint `feeds N` count.
- **D4 — Live build choreography:** thread the `BuildEvent` stream into `WorkflowGraph` so the in-flight node pulses and settles; step badges tie the chat checklist to card positions.
- **DoD:** the graph encodes edge kinds, direction, grain, and live build on the hero canvas.

### M-E · Credits + export / reproducibility — DONE ✓
- **E1 — Wire export:** whole-project export; `Push to GitHub` honestly stubbed; per-artifact + whole-conversation.
- **E2 — Interactive scope-down** in the estimate gate (drop 10y→3y, watch the estimate fall).
- **E3 — Credits model polish:** data-volume factor; balance co-located with the ticking meter.
- **DoD:** export round-trips; scope-down re-estimates live.

### M-F · Production-shaping surfaces — DONE ✓
- **F1 — Real login gate:** hold the queued action until auth, release on login; gate the *action*, not a blanket overlay; remove `?demo=1` bypass for prod.
- **F2 — Upload / bring-your-data** affordance (dashboard hero + empty canvas), simulated ingest → profiled dataset.
- **F3 — Account/Settings** surface; ⌘K search across artifacts + workspaces (at least scoped).
- **F4 — Data-seam audit:** confirm everything reads through `lib/data`; add a single fixtures↔API toggle.
- **DoD:** the three surfaces are production-shaped; auth/upload/search present (simulated, swappable).

### M-G · Landing funnel + polish + a11y + responsive — DONE ✓
- **G1 — Funnel:** Education/Community stubs each ending in a task-scoped "start here"; keep the brand landing.
- **G2 — Responsive** (mobile/tablet collapse of rail/chat/canvas), a11y (focus, roles, keyboard nav), reduced-motion.
- **G3 — States:** empty / loading / error everywhere; graph perf (virtualize if large).
- **DoD:** production-grade frontend polish.

### M-H · AWS-readiness (frontend) — DONE ✓
- **H1 — Deploy shape:** env config, static/SSR build, fixtures↔API source toggle wired to env.
- **H2 — Contract handoff doc:** the exact `lib/data` interface a real backend must satisfy (the swap is one seam).
- **DoD:** deployable to AWS; documented, single-seam backend swap path.

---

## Out of scope (until there's a need)
Team/org switching, member management, a Connectors/Resources page, real OAuth, a real compute/credit backend, multi-user collaboration. Add when collaborators or real infra demand it.

## How we work (no drift)
- Every PR/change names its milestone (e.g. `M-A3`).
- Mock data lands in `lib/fixtures/*` behind `lib/data`, labeled and contract-typed.
- Don't start a later milestone before the earlier one it depends on is done (e.g. richer faces M-C need the Spec fixtures M-B and the primitive kit M-A1).
- Verify each step in the running app (screenshot) before moving on.
