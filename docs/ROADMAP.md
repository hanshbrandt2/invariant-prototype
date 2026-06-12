# Invariant — Product Roadmap

**One line:** *Lovable, but for quantitative research.* You talk to it; it builds auditable, reproducible workflows on time-series / quant-finance data; every result is traceable to code you can run yourself.

**Status:** frontend-only prototype, built to transplant to a real backend behind one seam. The eventual target is a production app on AWS — public landing → login → dashboard → user workspaces — but the work *now* is getting the UX exactly right with mock data typed to the real contracts.

This document is the **anti-drift anchor**. Every change should map to a milestone below. Don't add scope that isn't here without adding it here first.

---

## North-star principles (the guardrails)

1. **Frontend-only, contract-typed mock data.** No backend, no real auth. All data is fake but typed to the real backend contracts and read through the single `lib/data` seam, so a live backend swaps in with no component changes.
2. **Honesty bar (hard).** Never show a capability the real backend can't do. Mock data is always *labeled* (`sample · N of M`, `pre-computed snapshot · as of <date>`) and never implies a live query. Real operators only; no invented data shapes. **Charts included** — a figure binds to a real (mock) source; no synthesized or distorted series (no `Math.sin` equity curve, no `preserveAspectRatio="none"` on data).
3. **Workflow-centric, canvas-is-hero.** The product is the *workflow* (conversation → build → graph/lenses), not a catalog browser. The canvas is the one focal surface; the chat recedes into the chrome.
4. **Editorial skin.** Warm paper / ink / clay, Source Serif 4 + Inter + JetBrains Mono, soft shadows on floating layers, rounded. No gradients, no sparklines. "Lovable meets The Economist."
5. **Production-shaped seams.** Components are dumb (read through `lib/data`, render). Keep the data layer swappable (fixtures today → `fetch()` later). One growing app — extend, never regenerate.
6. **One token spine.** A single *enforced* type/space/color scale — `--text-*` tokens + `lib/theme/editorial.ts` — not 52 ad-hoc `text-[Xrem]` sizes and per-file hex. Content out-shouts provenance via a ~4× display→meta ratio. Lint-guarded so it can't regrow.
7. **Answer-first, progressive disclosure.** Every surface leads with the *answer* (plain-language finding + one visual), reveals *how* (graph / code) on demand, and *proof* (contract / checks) deeper still. Details exposed only when needed. The `Result` lens is the model; the graph hairball is a "go deeper" rung, never the first thing seen.

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

## Phase 2 — the 10× craft pass (branch `v1.4-dev`)

M-A…M-H made Invariant **feature-complete and production-shaped**. Phase 2 makes it **beautiful and legible** — the "make it feel like hex.tech / Apple / Figma" pass. The rendered target is `docs/10x-direction.html`; the diagnosis is four root causes:

- **No enforced design scale** → "fonts feel too large" + crude, inconsistent charts (52 distinct `text-[Xrem]` sizes, no root font-size, per-file color hex).
- **Mechanism-first, not answer-first** → "unclear what to do / how things connect" (canvas can open on the graph hairball; inspector shows 6 tabs at rest; `nextProposal` exists in data but is never an action).
- **Honesty enforced for numbers but not visuals** → charts fabricate (`curve.ts` `Math.sin` equity rendered as real P&L) and distort (`preserveAspectRatio="none"`).
- **The empty→rich arc is built but unreachable** → nothing links `?state=new`; 12 fixture workspaces force the dense layout on every visitor.

Ordered by impact × dependency. **M-I + M-J are the foundation** (resolve "too large" + "charts look bad" and lay the viz-engine rail). **M-K is the headline clarity fix.** L/M/N are craft, connection, and hardening.

> **viz-engine stance:** do *not* take a dependency yet — `@invariant/viz` exports nothing (Phase-0 placeholder) and its DuckDB-WASM/Mosaic value (M4 over millions of rows) is moot on small pre-reduced fixtures. We **port the theme + grammar** behind a `ChartSpec` seam now, and swap to the compiled engine at its Phase 1 behind the unchanged seam. The `ChartSpec` (a deliberate subset of the eventual `ViewSpec`) is the contract between the repos: every chart Invariant needs that the engine can't yet express becomes a prioritized item for viz-engine's gallery — **the app drives the library's roadmap.**

### M-I · The token spine — one enforced scale (foundation) — DONE ✓
- **I1 — Type scale tokens.** Add `--text-*` to `globals.css` (display 2.25 · h1 1.75 · h2 1.25 · h3 1.0625 · body 0.875 · ui 0.8125 · meta-mono 0.6875 · micro 0.5625rem) with paired leading/tracking; set `body { font-size: 0.8125rem; line-height: 1.4 }` (13px chrome, hex-grade).
- **I2 — Migrate the 52 sizes.** Map every arbitrary `text-[Xrem]` onto the nearest token (0.82–0.86→`ui`, 0.88–0.98→`body`, 0.6–0.7→`meta`); drop dashboard h1 `2.5rem`→h1, the three section h2 `1.5rem`→h2, inspector hero `1.7rem`→h1. Reserve display type for `app/page.tsx` (marketing landing) **only**.
- **I3 — One chart/color theme.** Port `viz-engine/apps/harness/src/theme/editorial.ts` → `lib/theme/editorial.ts` verbatim (tokens + categorical/diverging/sequential ramps + `regimeColors`). Delete the per-file `TONE` maps + hardcoded hex in `finding-viz`/`preview-chart`/`histogram`.
- **I4 — Guardrail.** `package.json` lint: `! rg 'text-\[[0-9.]+rem\]' components app` (micro-chip allowlist) so the scale can't drift back to 52.
- **DoD:** UI defaults to 13px; **zero** arbitrary font sizes (lint green); every chart reads color/font from one theme.

### M-J · Honest, beautiful charts — `ChartSpec` + `<Figure>` — DONE ✓
- **J1 — Kill the fabrication.** Delete `curve.ts` (`Math.sin` equity); add an authored backtest equity/drawdown series to fixtures; remove `preserveAspectRatio="none"` (`compare-view`); fix the mislabeled waterfall (cumulative baseline, `finding-viz`).
- **J2 — The seam.** Add `ChartSpec` to `lib/types` (`mark: line|bar|area|scatter|heatmap`, encodings x/y/color, title-as-finding, `dataRef`) as a deliberate **subset of viz-engine's `ViewSpec`**; one `<Figure spec>` backed by Recharts; expose via `lib/data` (`getFigureSpec`). Components read a spec, never raw `{t,v}[]`.
- **J3 — Rebuild to the editorial look.** Map 1:1 to proven gallery usages — result equity→usage09 (equity+drawdown, one calendar); dataset line→usage01; histogram→usage05; finding distribution→usage32; waterfall→usage13; compare overlay→usage02 (normalized + direct end-labels). Real axes, hairline grid, mono ticks, direct labels, title-as-finding.
- **J4 — Marks Invariant lacks.** Add a correlation **heatmap** (diverging scale) + **regime ribbon** (`regimeColors`) — no DuckDB needed.
- **DoD:** no synthesized/distorted chart data anywhere; all charts render a `ChartSpec` via one `<Figure>`; renderer swappable behind the seam. *(Optional, fenced: one `ssr:false` vgplot+DuckDB-WASM hero chart for a genuine large-data series — opt-in, single route.)*
- **Status (DONE):** `curve.ts` deleted (the `Math.sin` equity is gone from all 3 surfaces); authored equity snapshot on the result spec → drawdown derived; `compare-view` distortion removed; waterfall made cumulative. `ChartSpec` + `<Figure>` (equity-drawdown / line / area / bar / heatmap / regime) + `lib/figures.ts` shipped; result equity + variant compare routed through it. **J4 done:** authored feature-correlation heatmap (diverging scale) on the matrix face, and an authored regime ribbon (`regimeColors`) on the result face — both honest snapshots. *Still optional:* route the few remaining direct `PreviewChart`/`Histogram` callers through `<Figure>` for total unification (they already read the shared theme).

### M-K · Answer-first everywhere — the disclosure ladder (headline clarity fix) — DONE ✓
- **K1 — Canvas leads with the answer.** Default a populated workspace to the `Result` lens with a "you are here" anchor (*"<friendlyName> — Sharpe 1.38. This is what this workspace found. How it was built ▸"*). Graph/Code/Concepts become "go deeper" rungs, not equal tabs; `Result` is visually primary.
- **K2 — The one next move.** Surface `ResultSpec.nextProposal` (already in data, used only inside the narrative) as **one** persistent clay "next step" button on the canvas.
- **K3 — Inspector calms down.** Default the drawer to a single Overview (lede + visual + built-from chips); collapse Spec/Contract/Checks/Code/Lineage behind one `details ▾`.
- **K4 — The empty state ships.** Make the welcome/empty variant the real default (first-visit via `localStorage`; keep `?state=new` for demos): one hero + 3 prompts + hosted data, nothing else; surface one exemplar Finding as the visible finish line; delete the duplicate "Start here" strip.
- **K5 — Plain language on the home surface.** Strip insider vocabulary (agentic / sealed / no-lookahead / pins) → plain verbs (Re-runs weekly / Verified / Continue); defer the technical terms to the inspector, defined on hover.
- **DoD:** a newcomer lands on the answer, has exactly one obvious next move, and reaches graph/code/contract only by choosing "go deeper."

### M-L · Numbers-as-heroes + hex craft — DONE ✓
- **L1 — One hero number per data card.** Promote the defining metric (Sharpe / ann. return) to the display tier (mono, tabular-nums); demote its label to a `meta` eyebrow; secondary stats small. (`findings-shelf`, `result-face`.)
- **L2 — Corner-tick plates.** Add a `.ticks` primitive (four clay/ink "+" via pseudo-elements) on the 3–4 hero plates (result chart, finding viz, lineage hero, dataset preview). A signal, not a texture.
- **L3 — Mono-metadata grammar + bracketed counts.** One quiet hairline-separated mono meta line per card; `Findings [N]` / `Recipes [N]` / `Workspaces [N]` count tokens on shelf headings; `built from [3]` on inspector input groups.
- **L4 — Color = signal.** Clay does exactly one job per surface (the action); kind/sealed/status become neutral ink-muted mono tokens, not colored chips; strip decorative emoji (🔒 ✓ ⤴ ▸); multicolor only inside charts, palette trimmed to ~3.
- **L5 — Motion restraint.** Remove idle infinite loops (`sealPulse`, idle `buildPulse`); replace the springy `snapIn` overshoot (cubic-bezier 1.56) with a calm ease; animate only on state transitions + one-shot reveals.
- **DoD:** data cards read "big number + what it is" across the room; color is signal-only; nothing breathes or bounces at rest.

### M-M · Connection in language + motion — DONE ✓
- **M1 — Plain edges.** One neutral line for the spine, one faint for branches; retire the 5-way dash dictionary + its legend.
- **M2 — Meaning in words.** Surface the dependency *kind* on hover/inspect via the existing `edge-inspector` prose; fold edge-inspection into the node drawer's Lineage view — one affordance: "click anything to inspect."
- **M3 — Build-stream as the lesson.** Frame the `runBuild` stream as the connection story (watch data flow into the finding); a one-shot, `localStorage`-gated 3-step first-run coachmark (*"This is the finding" → "Click a node to see how it's made" → "The contract keeps it honest"*).
- **DoD:** connection meaning is read in words + motion, not decoded from a dash legend; first-run teaches data→finding in <60s.

### M-N · Hardening + guardrails — DONE ✓
- **N1 — Contrast + size pass.** Faint-mono min size/contrast to WCAG AA; audit clay-on-clay-wash chips; emoji-as-status get text alternatives or become mono tokens.
- **N2 — Mobile charts.** `<Figure>` responsive (no fixed-px SVG width / `overflow-x-auto` spill); the hover-only canvas gets a tap/keyboard path.
- **N3 — Guardrail lints.** No arbitrary `text-[]`; no hardcoded chart hex (must read `lib/theme`); no synthesized chart series (chart-honesty check); a jargon-on-home allowlist.
- **N4 — Success test.** "Can a non-quant explain what a workspace found in one sentence?" — the acceptance bar for K1/K4.
- **DoD:** WCAG AA on text/contrast; charts don't overflow on mobile; guardrails prevent scale/theme/honesty regressions.

---

## Phase 3 — the research session (branch `v1.4-dev`)

Phase 2 made the workspace beautiful and legible. Phase 3 changes its **shape**:
from "build one answer on a canvas under an always-on contract rail" to a
long-running **research session** — the visualization is the hero, every number
falls through to the raw data underneath it, the trail is a **tree you fork
freely** (nothing lost), the curated subset is a **pinboard deliverable**, and
the honesty machinery retreats from a persistent bar to a quiet **audit**
affordance. The decisions are recorded in `docs/adr/0001-the-research-session.md`;
the rendered target is `docs/session-model-direction.html`.

> **The reframe in one line:** the contract is the *engine* (kept, wired,
> on-demand), not the *chrome*; trust is something you **do** (trace a number to
> its source), not something you read (a hash); and history is a **tree**, not a
> stack — the same model powers the micro-dive and the macro-session, deleting
> the `slice(0, d)` amputation bug.

Sequenced by impact × dependency. M-O is the lowest-risk, highest-payoff declutter
and unblocks the audit surface; M-P/M-Q stand up the tree model and its map;
M-R/M-S make the viz the universal trust surface and give the session a
destination; M-T reframes the bound and hardens.

**Cross-cutting decisions & risks (from the Phase-3 scoping sweep — apply across all milestones):**
- **A node is ONE coherent answer; the 5 narrative chapters stay *inside* it.** `finding · factors · model · regime · recipe` (`workflow-narrative.tsx`) are a node's *internal* scroll-spy structure, **not** separate session nodes — otherwise every build explodes the trunk into 5 nodes and the map is unreadable.
- **One tree model, committed early.** The dive is a *subtree* of session nodes, not a parallel structure — `dive` and `session` share `lib/session`. Two models forfeits "one state, two drivers" and doubles the persistence surface.
- **`ScopeQuery` carries origin.** A brushed range / chip remembers *which viz* it came from (two filters on the same field from different views are different objects) — "scope without provenance becomes sludge" (design-principles §7). The scope vocabulary is drawn from the **real fixture knobs** (`knobForOp`, sweeps: z-window, regime, eval-horizon, leg), never an empty abstraction.
- **Three distinct motions, three meanings.** *Travel* (node→node) **morphs** the canvas (~250ms object constancy, never teleports); *trace* drills **down** within a node (the dive cascade's `rise`); *lens-switch* retells the **same** node four ways (instant). All respect `prefers-reduced-motion` (instant when reduced).
- **As-of slot now, lit later.** The type + a "frozen vs live diverged" badge slot exist now (faked on authored snapshots); the backend lights up live re-execution + the disagreement badge.
- **Runs / agentic / promote / publish stay orthogonal.** The SessionTree is exploration-only; runs are immutable executions (hide map detail when `activeRunId !== null`); promote/publish keep working untouched.
- **Risks to verify before shipping each milestone:** (a) hoisting dive/session state must use a context/memo boundary so a dive doesn't re-render the whole client; (b) localStorage quota over a 100+-node session → **delta-store** + debounce saves (losing hours of work is the exact betrayal the model prevents); (c) the canvas morph is make-or-break craft — bad morph = teleport = "where am I?"; (d) stripping the rail must keep the **engine** wired — verify `?agentic=halt` still halts and publish still gates on stale/`sealOk`; (e) collapsible map/pinboard so the **viz stays the hero**, not squeezed by its own meta-chrome.

### M-O · Strip the rail → audit affordance + the session-map / pinboard *shell* — DONE ✓
The cheapest, highest-leverage move: demote the always-on contract bar to one quiet **audit** control, and stand up the session map + pinboard as **inert chrome** so the workspace *looks* like the session model before any data-model change. Zero data-model risk; the engine stays intact.
- **O1 — Remove the rail from the canvas chrome.** Drop `<ContractRail>` from the workspace header stack (`workspace-client.tsx`). The canvas gains vertical room; the viz leads.
- **O2 — The audit affordance.** Add a quiet **audit** button to `workspace-topbar.tsx` carrying the seal dot (green `sealOk` / clay blocked) + `N invariants` count. Clicking opens an **Audit panel** (right slide-over, sibling of `PublishPanel`) that hosts the existing pins / `IntegritySeal` / `PinDrawer` (holds · enforce · scope · mechanism · can't-prove) / validator. Extract those bodies into `audit-panel.tsx`; relocate, don't rewrite.
- **O3 — Keep the engine wired.** `sealOk`, `deriveValidator`/`validatorOk`, the publish gate (`publishBlockedReason`), the agentic **halt** (`flashedPin` → now flashes inside the audit panel), and `togglePin` are untouched — only their *surface* moves. The stale bar stays (it's actionable, not chrome).
- **O4 — Retire the dead chrome.** Remove the consequences toggle strip and the `VintageSlider` interactive widget (vintages become a read-only "pinned as-of" line inside audit); collapse-state logic goes with the rail; `PinChip` drops the lock/gate/"designed" decorators to label-only.
- **O5 — The session strip (inert shell).** New `session-map.tsx` (a small SVG tree) + `pinboard.tsx` in a bottom strip on the main column (exploration-only; hidden when `activeRunId !== null`). For M-O it reads the **existing `turns`** as a trunk-only tree (no branches yet) and shows an empty pinboard with its copy ("Exploration is free; only pins become the answer"). No wiring — that's M-Q/M-S.
- **O6 — Budget-as-bound (presentational).** Reframe the topbar credit pill as the iteration bound — a thin bar + `N cr · ~M questions` (balance ÷ rolling avg cost). `useCredits()` unchanged; presentation only (full reframe in M-T).
- **DoD:** the canvas shows no contract bar; audit is one click from the top bar and reveals pins/validator/lineage; the bottom strip shows a trunk-only session map + empty pinboard; the credit pill reads as a bound; publishing a blocked/stale result is still gated; `?agentic=halt` still surfaces its violated pin (now in audit); no regression in result/graph/code/concepts, runs, stale rebuild, fork, promote; `pnpm check` + build clean.

### M-P · History is a tree — the session model (`lib/session`) — DONE ✓ (deep-link `?node=` lands in M-T)
Replace the dive stack with one tree model, hoisted and persisted; fork is lossless.
- **P1 — The model.** New `lib/session/tree.ts`: `SessionNode = { id, parentId, query, scope, view, kind, createdAt }`, `SessionTree = { nodes, rootId, currentId }`, pure reducers `continueWith` / `fork` / `navigate`, and `pathTo(current)`. A `dive` is a node whose `view` is a `(space,index)` descent; a session question is a node whose `view` is a lens+focus.
- **P2 — Kill `slice(0, d)`.** Reimplement the Insight dive (`workflow-narrative.tsx`) over the tree: backtrack-then-pick **forks** (sibling), the abandoned branch is preserved and reachable, never amputated.
- **P3 — Hoist + persist.** Lift dive/session state from `workflow-narrative` to `workspace-client` (survives lens switch / drawer); a `lib/session/store.ts` auto-saves to `localStorage[invariant.session:{workspaceId}]` (debounced) and restores on mount; deep-link `?node=` encodes the current path (short delta; full tree in storage).
- **DoD:** equity→signal→spread→raw dives; backtrack + pick a different point creates a *branch* (old branch still there); reload restores the tree at the same node; lens switch doesn't lose the dive.

### M-Q · The session map — the new meta-chrome — DONE ✓ (agent-drives-tree → M-T)
Surface the tree where the rail used to be.
- **Q1 — `session-map.tsx`.** ✓ A compact navigable tree: trunk of question nodes + fork branches (scent chips) + **current** node (clay ring) + per-node dive-depth ("↓ traced N levels"). Reads `SessionTree`; clicking a node *travels* the canvas (the viewport morphs via `.canvas-travel`, object constancy — it never splits).
- **Q2 — Continue vs fork verbs.** ✓ Explicit `continue ↳` (grow the line) and `fork ⑂` (a sibling line, the old one kept) in the conversation; `submit` appends a question node (continue = child of the current question, fork = sibling).
- **Q3 — One state, two drivers.** The `actor: 'user' | 'agent'` field is plumbed and the map renders agent provenance; the full *agent forks the same tree* wiring (`lib/sim`) lands in **M-T** (it was P-G in the scoping sweep — kept there to not corrupt the immutable-runs boundary).
- **DoD:** the map renders the live tree in the rail's old slot; clicking travels the canvas (morph, no teleport); forking shows a branch; abandoned branches stay reachable via scent chips; dive depth shows per node. ✓

### M-R · Universal drill-to-raw — the viz is the trust surface — DONE ✓
Make the dive a universal, resolver-driven mechanism (not a hardcoded chain), honest by construction.
- **R2 — The "underneath" resolver.** ✓ `lib/figures.ts` `drillUnderneath(space, spec) → DiveSpace | null` is the single source of the chain (`return → signal → spread → raw → ∅`); a space is drillable IFF the result carries an authored snapshot beneath it. The narrative's hero entry + every cascade `below` now read the resolver (the hardcoded `spec.spreadSeries ? …` checks are gone).
- **R1 — Uniform `onPick`/`selected`.** ✓ The `<Figure>` seam accepts `onPick`/`selected` for any mark and the chain marks (`equity-hero`/`signal`/`spread`) drive `HitLayer`; terminal marks no-op (zero regressions). The mechanism is uniform — any mark lights up the instant authored depth is added beneath it.
- **R3 — Honest affordance + honest terminal.** ✓ The "↑ trace it down" hint stamps **only** where `drillUnderneath` has a target; `raw` is the labeled floor; marks with no authored underneath (weights / regime / correlation) are honestly terminal — no false affordance, no synthesized descent. (Invariant has the lineage internally to make any chart drillable; the prototype authors the equity finding's depth and leaves the rest terminal — exactly the "it CAN, it needn't surface" stance.)
- **DoD:** the dive is resolver-driven and single-sourced; every drillable point traces down recursively to raw; non-drillable marks carry no false affordance; chart-honesty lint passes; tsc + build clean. ✓ (More authored descents — regime→spread, the gas leg — are data-authoring follow-ups, not mechanism work.)

### M-S · The pinboard — the curated deliverable — DONE ✓ (session-compare → follow-up)
Two planes: free exploration vs the report assembling itself.
- **S1 — Pins ride inside the SessionTree.** ✓ `pin`/`unpin`/`pinnedNodes` on the tree (a pin = `node.pinned` + `annotation`), so pins persist with the session for free — no separate store, one save/load (the synthesis' reconciliation).
- **S2 — Pin from the canvas + the map.** ✓ A quiet "pin ★" in the finding header (pins the current question node with the finding headline as its memo line) and a ★ toggle on every session-map node. **Orthogonal to publish** — publish seals a read-only citable finding; a pin bookmarks an explorable session state.
- **S3 — The pinboard surface.** ✓ The right rail of the session strip renders `pinnedNodes` in trunk order ("the memo, assembling itself"), each click **travels** the canvas to that node; unpin on hover; live pin count. "Exploration is free; only pins become the answer."
- **DoD:** pin a finding (or a map node) → it appears on the pinboard in order; clicking a pin travels there; pins persist across reload (in the session tree); pins are visibly distinct from published findings. ✓
- **Follow-up (not blocking):** a deliberate two-branch **compare** mode (side-by-side node viewports) and an optional dashboard "saved views" shelf — the existing variant-compare drawer already gives side-by-side for forked variants; session-level compare is a larger build deferred past the v1.4 sweep.

### M-T · Budget-as-bound + hardening — DONE ✓
- **T1 — The honest bound.** ✓ The topbar credit pill reads as the iteration budget — `N cr · ~M q` (remaining ÷ avg cost); no timer, no hard cap — compute is the ceiling (ADR D6).
- **T2 — Guardrails extend.** ✓ `pnpm check` now also runs **`check:seams`** (components read through `@/lib/data`, never a store/fixture directly) and **`check:session`** (the SessionTree fork/round-trip proven by execution, `node --experimental-strip-types`). Typescale + chart-honesty still green.
- **T3 — Deep-link + agent + a11y + mobile + perf.** ✓ `?node=` restores the exact node (precedence deep-link > localStorage > bundle) and the URL stays in sync (`replaceState`); the agentic run lands an `actor:'agent'` node on the same tree (one state, two drivers); the canvas morph is `prefers-reduced-motion`-safe, the audit panel has ESC, map/pin controls are keyboard-reachable; the session strip collapses below `lg` (canvas stays the hero on phones); saves are debounced (light over a long session); the empty/first-run coach teaches trace/continue/fork/pin/audit; the 5 chapters render **inside one node** (a node is one answer — ADR D9).
- **T3 — Sweep.** ✓ tsc + `pnpm check` + production build clean; runtime sweep of 8 routes/states (default · `?lens=graph` · `?node=` · `?agentic=halt` · new · dashboard · landing · settings) all HTTP 200 with no error boundary and no genuine SSR errors. (No Playwright in the repo; verified via SSR + dev-log + the on-disk client chunk. The `[browser]` Fast-Refresh errors during edits were stale already-open tabs — cl:hard-reload clears them.)
- **DoD:** the budget reads as the bound; guardrails cover Phase 3; the route/state sweep is error-free; build is clean. ✓

---

## Out of scope (until there's a need)
Team/org switching, member management, a Connectors/Resources page, real OAuth, a real compute/credit backend, multi-user collaboration. Add when collaborators or real infra demand it.

## How we work (no drift)
- Every PR/change names its milestone (e.g. `M-A3`).
- Mock data lands in `lib/fixtures/*` behind `lib/data`, labeled and contract-typed.
- Don't start a later milestone before the earlier one it depends on is done (e.g. richer faces M-C need the Spec fixtures M-B and the primitive kit M-A1).
- Verify each step in the running app (screenshot) before moving on.
