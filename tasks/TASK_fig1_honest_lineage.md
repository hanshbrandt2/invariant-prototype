# Task — Make Fig 1 (landing lineage) honest, then drive it off a real lineage

## Why
The landing page's Fig 1 lineage graph is a **capability claim**. Invariant's whole pitch is "no overclaiming, every result reproducible," so every node, edge, and policy in that figure must map to something the platform can actually do. It is currently hand-authored and contains at least one invented element (EIA crude inventories / an "inventory surprise" feature) that the platform likely cannot run. Make it honest.

## Step 1 — Verify the real capability set (read source, do not assume)
Read the backend repos and report the ground truth **before changing any UI**. If this session doesn't have the backend repos, ask for them or for the relevant files pasted in.
- **data-catalog** — which datasets are actually ingested / hosted? Confirm explicitly: is there any *fundamentals* source (e.g. EIA inventories)? Is there a multi-contract WTI *curve* registered as a dataset (vs. just an intermediate)?
- **dsl-engine** (`operator_registry.yaml` / `registry.py`) — the full operator list. Confirm these exist: `stitch_contracts`, `rolling_zscore`, term-structure carry (`term_carry`/`carry_*`), `build_signal_matrix`, `shift_returns` (forward return), `fit_model`, and a backtest operator. Is there ANY "surprise / fundamentals" operator, or is the registry purely market-microstructure?
- **artifact-catalog** — the seeded policy instances and their classes (confirm a `roll_stitch_policy` instance and a `position_sizing` instance exist; report exact names).

Output the three lists.

## Step 2 — Make Fig 1 honest
Update the landing Fig 1 (frontend prototype) so every node / edge / policy resolves to something verified in Step 1:
- **Drop anything unverified** — EIA inventories, inventory surprise, etc. — unless Step 1 proves it exists.
- Reach "≈3 datasets, ≈2 policies" using **only real market data** you confirmed (e.g. front-month + the curve + a second real energy series), never fundamentals you don't ingest.
- Apply the readability fixes so the graph reads left-to-right as a sentence:
  - **Human labels** on nodes — friendly name / description primary, mono id (`crude_oil_1m`) secondary. If artifacts have no `description`/`friendly_name` field, report it; it's a small nullable column to add.
  - **Operators on edges** (the verb): stitch, z-score, carry, shift-forward, assemble, fit, backtest.
  - **Policies as governing (dashed) edges**, attached to the stage they govern.
  - **Connect the target to its source** — the forward-return target derives from the dataset via a forward shift; draw that edge. It must not float.
  - **Stage lanes** (dataset → feature → matrix → target → model → result) so fan-in stays legible.
- Structure the fixture as a **real lineage shape** (nodes + typed edges, matching the artifact/lineage contracts) so it can later be swapped for a live export with no rework.

## Step 3 — The durable fix (note for when the backend is wired)
Once the backend exists, Fig 1 should be **generated from a real `crude-oil-research` lineage export**, not from fixtures — honest by construction, and it updates as the platform grows. Build the fixture now to match that future shape.

## Acceptance
- Every node, edge, and policy in Fig 1 maps to a real dataset / operator / policy — include the mapping in the report.
- No invented capabilities remain.
- Target connected to its source; nodes carry human labels; edges carry operators; policies are governing edges; lanes intact; reads as a sentence.
- The three verified lists from Step 1 are reported back.

## Do not
Invent datasets / operators / policies to enrich the figure · keep EIA / inventory-surprise unless verified · hand-author what could be a real lineage shape.
