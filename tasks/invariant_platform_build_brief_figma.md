# Invariant — platform build brief (for Figma Make)

Paste below the line into Figma Make. This is the **target to iterate toward** — extend the current build (keep the `inspectorRegistry`, the nav stack, the conversation-drives-the-canvas behaviour, the catalog, the edge inspector — those work). This brief fixes the feel, adds the front door, and locks the product arc.

---

Build **Invariant**, a reproducible-analysis workspace for time-series / quantitative finance. A user talks to it in plain language; it runs auditable calculations on financial data; every result is inspectable, traceable, and exportable as runnable Python. It is **not** an app builder, **not** a generic SaaS dashboard, **not** a marketing-heavy site. The one promise: *every number is traceable to code you can run yourself.*

The product has **three surfaces**, each with a different job: the **landing** (public brand page), the **dashboard** (logged-in home / hub), and the **workspace** (where the work happens).

## 0. The governing principle (read first)
The canvas always shows **the one thing you're working on, beautifully**. Complexity is *earned* as you work — it accretes through the conversation, never dumped at t0. The biggest current mistake is opening at maximum density (a metadata table, a wall of cards) before the user has done anything. Fix that by sequencing: empty → one dataset → one artifact → a growing graph.

## 1. Visual system (the look)
- Background warm paper `#FAF7F1`; panels `#FFFFFF`; inset surfaces `#F3EFE7`; hairline borders `#E7E1D5`. Ink `#1C1B18`; muted `#6B675F`; faint `#9A9388`. Accent clay `#BE4D2B` (sparing). Data blue `#1F4E79`; success `#3B6D11`.
- Type: editorial serif (Source Serif 4) for titles and chart headings; Inter for UI/body; JetBrains Mono for code, data tables, hashes. Sentence case. Two weights.
- Flat. Hairline borders, radius 8 (controls) / 12 (panels). Thin line icons. **No gradients, no shadows, no glass.**
- **No sparklines** (filler). **No AI-model picker** (routing is automatic and silent). This skin applies to ALL three surfaces — the dashboard uses the same editorial paper/serif/mono look, **not** a dark neon-gradient launcher.

## 2. The exact workflow
Three surfaces, in this exact order:

1. **Landing** (public, logged-out) — brand page, one promise, one CTA. Logged-out users may also browse Education/Community and *preview* hosted datasets (read-only). No building.
2. **Login** — the gate. One-tap OAuth (Google / GitHub) + email. It sits at the first real action: entering the workspace, starting a build, or clicking a "start here" seed. On auth-return, the user lands exactly where they intended — the **dashboard** if they clicked "enter," or **straight into a workspace with the build firing** if they clicked a starter/compose.
3. **Dashboard** (logged-in home) — the hub. Start a new analysis or resume an existing workspace. This is where returning users live.
4. **Workspace** (the work surface) — conversation + canvas, empty→rich. Building happens here, metered by credits.

Mental model: dashboard = the launcher you return to between sessions; workspace = where the conversation and canvas live.

## 3. Landing (keep it Lovable-clean)
One promise, one action. Hero "Bring your data. Find the signal." + one value line ("auditable, your ideas are the only limit") + **one** primary CTA. Below it, a thin "popular starts" strip (3 links). That's it. **Cut** the workflow-trail explainer, the six "try asking" chips, the five persona cards, and the verbose dataset copy — kitchen sink. The landing is the *brand page*; the *funnel* is Education/Community pages (each ending in a task-scoped "start here" — vol term structure, return attribution, portfolio optimization — that opens a pre-scoped conversation). Leave room for those; don't build them here.

## 4. Login
- One-tap **OAuth (Google / GitHub)** + email fallback. Minimal — do not overbuild auth.
- The wall sits at the first action that needs an account: **enter workspace / start a build / click a "start here" seed.** Browsing the landing, Education/Community, and previewing hosted data stay public.
- **Resume intent on return:** after auth, fire the queued action — land on the dashboard, or drop straight into the workspace with the requested build already running. Login is never a dead-end detour; it releases the thing the user already asked for.

## 5. Dashboard (logged-in home)
The hub. Lovable's *structure*, Invariant's editorial *skin* (warm paper, serif, mono — never neon).

- **Hero = start a new analysis, data-rooted.** A single input — "What are you researching?" — prefilled with a **rotating starter prompt** (see 5a), plus the hosted-data picker / upload right beside it. Typing, picking, or running the starter drops the user into a fresh workspace.
- **Your workspaces, as cards.** Each workspace is a research thread (e.g. `crude-oil-research`). The card preview is the workspace's **lineage graph in miniature** — not a screenshot. The dashboard literally shows provenance at a glance. Grouped "recently active" / "all."
- **"Start here" strip** — the curated hosted datasets and task seeds (vol term structure, return attribution, portfolio optimization), the same funnel entries surfaced for logged-in users.
- **Sidebar:** Home · Search (⌘K across artifacts + workspaces) · Hosted data · Workspaces · Community/Education · and at the bottom the **credit balance + account** (the freemium meter lives here, never on the landing).
- **Two states:** a brand-new user (no workspaces) gets an onboarding-forward dashboard — the hero + hosted data foregrounded (the first-wow loop); a returning user sees their workspaces up top with "start new" beside them. Same surface.

### 5a. The rotating starter prompt
- The hero input shows **prefilled, editable** example text that demonstrates real range and removes the blank-page barrier — e.g. *"Backtest a long/short on the top 30 US equities over 10 years."*
- It **rotates daily** from a curated pool (seed the pick by date so it's stable within a day). Also surface 2–3 of the pool as clickable example chips beneath the input.
- **Honesty bar (hard):** every prompt in the pool must be *achievable by the platform's design* — expressible in the operator algebra and reproducible, runnable on a hosted dataset or bring-your-data. Never a prompt the platform can't actually do.
- Make the prefilled text trivially clearable — one keystroke / click replaces it; it must never fight a user who wants to type their own.
- The empty *workspace* conversation can show the same rotating prompt as its greeting, so the starter idea carries from dashboard into the work surface.

## 6. Credits / freemium (lives in the workspace + dashboard meter, not the landing)
- A "build" is a **distribution**, not a constant: "what's in this data" is one cheap step; "10-year long-short technicals backtest" is dozens of steps over a decade of rows. So credits track **work** (operators × data / compute), not a flat per-build charge. (Exact cost function calibrated later.)
- The **planner decomposes** a request into a task DAG — that decomposition *is* the cost estimate.
- **Cheap builds just run** (debit shown after). **Big builds get an estimate + confirm**: "~14 steps over 10 years · est. ~8 credits · ~2 min — run it?" The propose→approve gate now approves the *spend*, not only the computation.
- The **task list doubles as the meter**: steps tick, the credit balance is visible, scoping down ("10 years → 3") drops the estimate before committing.
- **Free tier = the cheap first-wow loop** (explore a hosted dataset, derive a small feature, draw a chart — one full first session). Paid = the expensive multi-step builds. Balance indicator lives in the workspace and the dashboard sidebar, never on the landing.

## 7. The workspace (where the work happens)
- **Empty canvas on a new conversation = an invitation, not blank.** One move: "start with data" (hosted picker + upload). The conversation greets and asks "what are we analysing?" — optionally with the rotating starter prompt. Coordinated, one decision.
- **The conversation is the build interface**: whatever the user writes compiles to a build that materialises on the canvas.
- **One switchable canvas** (Lovable mechanic), conversation always-on at left. The canvas **leads with the visual** — chart, table, lineage — **never code or a key-value metadata table** first.
- **Watch it build**: pick/upload → the canvas builds the node in front of you (registering → profiling → "3.8M rows, 12 cols, 0.4% missing" → it lands), narrated honestly with live job progress.
- **Default view for a fresh dataset = Overview**: name, source, rows/cols/coverage, a preview chart, missingness — with Table, Schema, Chart, Code (`load("…")`), Lineage as tabs.
- **Polymorphic kind-aware inspector**: faces vary by node kind (the 11 artifact kinds + operator + raw-dataset). One inspector, a faces-by-kind registry, a nav stack with a breadcrumb. Header: kind badge + state badge + harness status + lineage hash + policy chips.
- **Lineage is a hero**, not a mini-map: full-canvas stage-laned graph (dataset → feature → matrix → target → model → result), clickable edges (open the edge inspector), reverse-topological provenance chain below.
- **Export / reproducibility**: per-artifact and whole-conversation — Download .py · Download project + data · Push to GitHub.

## 8. Copy & labels
Plain intent language on actions and chips — "how it was built", not "show DAG"; "where it came from", not "lineage" on a button. Formal vocabulary (`DAG`, `operator`, `adaptedness`, `content_hash`) belongs only inside the deep inspector/spec faces, where a technical user has opted in. Copy is lowercase-leaning, precise, unmarketed.

## 9. Screens to generate
1. **Landing** — simplified, one CTA, popular-starts strip.
2. **Login** — one-tap OAuth modal; resumes the queued action on return.
3. **Dashboard — returning user** — hero with rotating prefilled prompt + hosted data, workspaces as lineage-thumbnail cards, sidebar with credit balance.
4. **Dashboard — new user** — onboarding-forward (hero + hosted data, no workspaces yet).
5. **Empty workspace** — hosted-data picker + upload, conversation greeting.
6. **Dataset just built** — Overview default view (KPIs + preview chart + schema), build narration resolving.
7. **A big build** — the estimate + confirm dialog, then the task-list meter ticking with the credit balance.
8. **Polymorphic inspector** — two kinds: a `dataset` (Overview/Data/Output/Lineage/Code) and a `result` (Output + a prominent **Next-move / next_proposal** panel).
9. **Lineage as hero** — full-canvas stage-laned graph + provenance chain.

## 10. Sample content (use this, not lorem)
Workspace "crude-oil-research". Hosted datasets: `nasdaq-large-cap` (databento.silver.ohlcv-1d), `crude_oil_1m`, `ng_henry_hub_5m`, `fx_majors_tick`. Nodes: `front_month_cont` (feature), `front_month_ret` (feature, log returns), `zscore_20`, `carry_5d`, `signal_matrix_v3` (matrix), `fwd_ret_5m` (target), `linreg_baseline` (model, ridge α=0.1), `bt_2024_06_meanrev` (result). Policy `roll:wti:v3`. Real crude-futures numbers ($70–85/bbl). Hashes like `7f3c…a1d2`.

Rotating starter-prompt pool (all achievable-by-design; verify against the registry before shipping):
- "Backtest a long/short on the top 30 US equities over 10 years"
- "Build a vol term-structure view for WTI front-month"
- "Find anomalies in Henry Hub gas over the last year"
- "Attribute returns of nasdaq-large-cap by sector"
- "Test a mean-reversion signal on crude over 2024"
- "Compare carry across the FX majors"

## 11. Hard avoids
Don't open at max density — earn it. Don't lead the canvas with code or a key-value metadata table. No sparklines. No AI-model picker. No gradients/shadows/glass — including on the dashboard (editorial skin, not a neon launcher). No kitchen-sink landing. No jargon on action chips. Rotating starter prompts must never claim something the platform can't do. Don't regress the conversation-drives-the-canvas behaviour. Editorial, calm, alive, trustworthy.
