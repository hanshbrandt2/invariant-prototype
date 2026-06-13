# ADR-0002 · The Backend — the spec is the truth, the published code is its receipt

> We do not run a kernel per workspace. We run the **validated spec**, centrally.
> The Python you read in the Code lens — the same Python you can download, clone
> into your own engine, and publish to GitHub — is a **parity-verified rendering**
> of exactly what executed. So trust is not a hash you take on faith; it is a
> result you can **re-run yourself** and get the same numbers.

- **Status:** Accepted — 2026-06-13
- **Scope:** the architecture of the **real backend** behind the Invariant frontend
  (`NEXT_PUBLIC_DATA_SOURCE=api`). This ADR is the *binding architecture*; the
  *order of wiring* stays in `docs/MIGRATION_TO_BACKEND.md`, the *interface* in
  `docs/BACKEND_CONTRACT.md`. The frontend is unchanged by this ADR.
- **Builds on:** ADR-0001 (the research session — the workspace, the tree, the dive)
- **Companion docs:** `docs/BACKEND_CONTRACT.md` (the `lib/data` interface — the *what*),
  `docs/MIGRATION_TO_BACKEND.md` (the BFF + sequence — the *how/order*),
  `docs/ROADMAP.md` (the anti-drift anchor; backend = Phase 4)
- **Coordinated platform ADRs** (in `platform-meta/docs/adr/`, distinct numbering):
  ADR-0033 (operator measurability / the leakage trust core), ADR-0037 (predictive
  vs descriptive — the `analysis` stage), ADR-0023 (bitemporal vintage / knowledge-time),
  ADR-0024 (`producer_code_hash`), ADR-0045 (every boundary is a declared file + a gate),
  ADR-0048 (data versioning — table format + experiment lockfiles)

---

## Context

The frontend is feature-complete and built to transplant: every read goes through
`lib/data`, the build/chat stream is specified by `lib/sim`, and the types in
`lib/types` *are* the contract (the cardinal rule). Three of the four backend
services it maps to are real FastAPI services; `dsl-engine` — which owns the
**executor** and the **codegen** that `getCodeMap` needs — is the skeleton
(`MIGRATION_TO_BACKEND.md` §1). So before that skeleton becomes flesh, we must
decide *what the backend fundamentally is*, because two different backends could
satisfy the same `lib/data` shapes while making completely different trust claims.

The product's pitch (`ROADMAP.md`, line 3) is the load-bearing sentence: *"every
result is traceable to **code you can run yourself**."* The Code lens already
emits a real, pip-installable `invariant_research/` package; the export menu
already ships it (`M-E`); `Push-to-GitHub` is honestly stubbed. The frontend's
honesty bar already states the claim out loud — *"code is written against the
INPUT SCHEMA the user supplies… Same bars in → same result out"* (`lib/fixtures/code.ts`).

The user's framing of the design question this ADR answers:

> *"Each workspace is its own IDE that uses the DSL, artifacts, and the in-house
> viz library to execute what the user wants — and in the code lens he sees exactly
> the Python behind everything. That is complete trust. My use case: I find
> something interesting, I clone that code into my own execution engine and put it
> in production; and if after all the verification I still didn't trust it, I could
> export the code and read it line by line."*

The seductive reading is "make each workspace a live kernel that runs the
publishable Python directly, so what-ran == what-you-read by construction." That
*sounds* like it delivers the trust, but it inverts the thing that makes this
platform different from a nicer Jupyter: the trust core is the **DSL**, not the
Python. Validating a typed operator DAG for no-look-ahead and measurability
(platform ADR-0033) is tractable; validating arbitrary Python is not. Executing
Python per tenant would (a) bypass the validator, (b) make a multi-hour session a
RAM-resident process per user, and (c) put a code generator on the **correctness**
critical path. The guarantee the user actually wants — *"what executed ≡ what I
read ≡ what I can re-run"* — does **not** require executing Python. It requires the
published code to be a *proven-faithful rendering* of what the validated executor
ran. That distinction is the whole ADR.

---

## Decisions

### D1 · The workspace is a reactive document of validated specs — not a kernel

Execution runs a **validated DSL DAG**, centrally, as content-addressed jobs
(`research-workbench` executing over `dsl-engine`), surfaced to the frontend through
the existing `lib/sim` stream (`estimateBuild` → `runBuild` → `BuildEvent`s). There
is **no per-workspace Python kernel** and **no live arbitrary-code REPL** on the
tradeable path.

The "kernel feel" the user is reaching for — warm, stateful, interactive, *yours* —
is delivered without kernel semantics by the ADR-0001 **session tree** plus
content-addressed artifact caching: the session is *reconstructible* from
`(spec + cached artifacts)`, so a warm worker can be evicted and rebuilt on demand.
Felt statefulness, not a resident process.

*Why.* It keeps the validator alive (the moat), keeps execution **costable before it
runs** (a typed DAG can be priced — rows × ops × time-range — which is what makes the
credit meter of ADR-0001 D6 honest), and keeps results **shareable across
workspaces** (the same `feature:…` computed once serves everyone — a per-kernel IDE
cannot dedupe).

### D2 · The spec is the source of truth; the published Python is a parity-verified rendering of it (`emit() ≡ execute()`)

`getCodeMap`'s "reproducible Python" must be **emitted from the same operator
definitions the executor runs**, and a per-operator **conformance gate** in CI must
assert that the emitted standalone script produces **byte-identical output** to the
in-process executor on fixture data. The frontend's hand-templated
`lib/fixtures/code.ts` is the *specification* for this emitter; the backend makes
it true rather than plausible.

This is the platform's existing pattern applied one layer down: `viz-engine` already
runs *one ViewSpec, two runtimes (TS + Python), `specHash` parity*. We do the same
for **compute** — one DSL spec, two renderings (the in-process executor that makes
the numbers, and the standalone emitter that makes the readable script), gated by
output parity. `dsl-engine` already requires a **determinism contract test per
operator**; the parity assertion rides on that test, not a new discipline.

Trust therefore has **three legs**, of which showing Python is the weakest:
1. **Legible code** — a human *can* read it (the honesty bar already mandates: real
   registry operators, input-schema-typed, no storage paths).
2. **A machine-checkable certificate** on the *spec* — the validator
   (`deriveValidator`/`validatorOk`, surfaced in the audit panel; platform ADR-0033
   measurability + no-look-ahead). This is the leg the prototype currently *derives
   from a mock lineage*; the backend makes it a real verdict.
3. **Drill-to-raw lineage** (ADR-0001 D4) — every number traces to source rows.

"Show the Python" without leg 2 is *false comfort* — code nobody can certify by
reading. The parity gate is what converts the Code lens from a beautiful attestation
into a falsifiable guarantee.

### D3 · "The same results" is a reproducibility receipt — code + lockfile + data manifest + a declared reproducibility class

`BACKEND_CONTRACT.md` invariant #2 ("re-running the same recipe on the same inputs
reproduces them") is operationalized as a **receipt**, not a hope. Every published
artifact ships:

- the **parity-verified standalone script** (D2);
- a **pinned lockfile** — the `requirements.txt` the prototype already mocks
  (`polars==…`, `numpy==…`, `scikit-learn==…`), made real (substrate: platform
  ADR-0048 experiment lockfiles);
- a **data manifest** — *which* instruments, *what* date range, *what* vintage —
  content-addressed and stamped `asOfKnowledgeTime` (honoring the no-look-ahead
  invariant and platform ADR-0023). Note `data-catalog` holds *definitions, not
  values*, so the manifest pins the values' content hash, not a path;
- a **declared reproducibility class per node**:
  - **bit-identical** for deterministic dataframe ops (filter, rolling, join, asof,
    derive, rank, unique) under the pinned lockfile;
  - **numerically-equivalent-within-ε** for model fits / foreign math (kalman, garch,
    coint, `fit_model`) — across machines, multithreaded BLAS reduction order drifts
    the last bits; bit-identity holds only within the *same* pinned environment.

`Node.contentHash` / `lineageHash` / `producerCodeHash` (already on the contract) pin
the receipt. A receipt that *declares its class* is more honest than one that vaguely
promises "exact" and then disagrees in the 14th decimal on someone else's laptop.

### D4 · Two execution lanes, fenced — validated-DSL on the tradeable path; sandboxed-Python only in the descriptive lane

The default and only path for `feature`/`matrix`/`target`/`strategy` work is the
**validated DSL** (D1) — no Python is executed, the leakage core holds.

For the genuine power-user case ("I edited the code, re-run it") there is **one**
place real code execution lives: a **descriptive `analysis` lane** (platform
ADR-0037) — a containerized, network-isolated, read-only-artifact-mounted,
output-capped sandbox, **structurally fenced** so an `analysis` output can never
feed a `feature`/`matrix`/`target`. Forward-looking-ness is *permitted-and-labeled*
here, never on the tradeable path. Resource control in this lane is the container's
job (cgroups/timeouts), not the validator's — which is exactly why it is fenced off
from the path where trust must be *proven* rather than *bounded*.

### D5 · Clone-to-production exports the **receipt**, not the kernel — and the receipt is a spec of what to compute, not a deployable

The unit you lift into your own execution engine is the **receipt of D3** (verified
script + lockfile + data manifest), never a workspace runtime. Honest boundaries
attached to that handoff:

- **Research-batch ≠ production-streaming.** The receipt is a batch program over
  history; production wants point-in-time feeds, latency budgets, risk limits, an
  OMS. The receipt is a *trustworthy specification of what to compute*, not a
  drop-in binary. The measurability classes (platform ADR-0033 `causal_finite` vs
  `walk_forward`) tell you what is safe to run *online*.
- **Cloning exits the trust boundary.** As generated, the code is leakage-safe and
  reproducible; the moment you edit it in your engine, *you* own the data you feed
  it, the versions you pin, and any leakage you reintroduce. That is the point of
  "you don't have to trust us" — but cloning means **taking ownership of correctness.**

This makes the receipt the explicit interface to the consumer repos: `strategies`
(the testing / brainstorming consumer of frozen data artifacts) and, downstream,
`trading-platform` (execution).

### D6 · No-drift is a declared boundary + a gate — the frontend contract is the spec the backend conforms to

Per the platform discipline (ADR-0045: every boundary is a declared file + a gate),
`lib/types` **is** the contract (already asserted in `BACKEND_CONTRACT.md`: "keep
them byte-for-byte"), and the backend is built to satisfy it with an **executable
conformance check**, not prose goodwill:

- the BFF's response shapes are validated against `lib/types` in CI (the
  `lib/api/MAPPING.md` of `MIGRATION_TO_BACKEND.md` §3, made a gate — the analogue of
  the platform's `check_contract_drift`);
- where a field genuinely does not exist yet, that is a **backend ticket, not a
  frontend hack** (the honesty bar);
- the frontend remains the **source of the contract**; the backend never silently
  reshapes it. Drift is a red CI failure, not a hope.

The BFF form, the no-secrets-in-the-browser rule, and the read-path-first sequence
are as already specified in `MIGRATION_TO_BACKEND.md` §2/§4 — this ADR does not
re-decide them, it makes the **contract conformance** between the two a gated
invariant.

---

## Now vs. later (the prototype seam)

| Concern | Now (prototype) | Later (this ADR's backend) |
|---|---|---|
| Execution | `lib/sim` recipes (regex intent → pre-authored steps), simulated stream | `research-workbench` executes a validated DSL DAG over `dsl-engine`; route handler proxies the real `BuildEvent` stream |
| Code lens (`getCodeMap`) | `lib/fixtures/code.ts` hand-templates real-but-unrun Python | `dsl-engine` **emits** the script from the same operator defs that executed, **parity-gated** `emit() ≡ execute()` (D2) |
| The validator seal | `deriveValidator`/`validatorOk` derived from the mock lineage | a real verdict from `dsl-engine`'s measurability/no-look-ahead validator; the audit panel + publish gate + agentic HALT read it |
| "Same results" | the honesty-bar *claim* ("same bars in → same result out") | a **receipt**: parity script + lockfile + data manifest + reproducibility class (D3) |
| Drill-to-raw | authored `ResultSpec` series, `drillUnderneath` resolver | a query layer over raw values (DuckDB/Mosaic) resolving a point → its producing subgraph (`MIGRATION` gap A) — the seam is unchanged |
| Resource control | the simulated credit meter | cost-estimate-before-run on the typed DAG + per-tenant credits; the descriptive lane is container-bounded (D4) |
| Arbitrary user Python | not offered | only in the fenced descriptive `analysis` sandbox (D4) |
| Clone / publish | export menu; `Push-to-GitHub` stubbed | export the verified **receipt** (D5); GitHub push real |

The cardinal rule holds throughout: every shape stays typed to `lib/types`, so the
swap is a data-source change behind one seam — and now a **gated** one (D6).

---

## Consequences

**Good.** The product's headline promise — "code you can run yourself" — becomes
*falsifiable* instead of aspirational: a stranger with the data reproduces the
numbers (bit-identical for dataframe ops, within-ε for fits) and can read the script
line by line knowing it is what ran. The validator (the moat) stays alive on every
tradeable result. Execution is costable and cacheable, which makes the credit meter
honest and lets one computation serve many workspaces. Resource control becomes a
graph-cost problem, not a bound-a-Turing-machine problem. The clone-to-production
and read-line-by-line use cases are served by the *same* receipt artifact.

**Costs / risks.** The parity emitter (D2) is real engineering in `dsl-engine`:
every operator must emit standalone source *and* prove it equals the executor — the
keystone, and the thing that converts the Code lens from theatre to guarantee.
Cross-environment bit-identity for model fits is **not** achievable (D3) — we manage
it by *declaring the class*, not by pretending. The descriptive sandbox (D4) is a
genuine security surface (containment, network isolation, output caps) and must
*never* be reachable from the tradeable path — a fence bug there is a leakage hole.
The no-drift gate (D6) adds CI cost and a mapping module (`lib/api/`), paid back the
first time it catches a silent backend reshape.

**Explicitly out of scope / open coordination (not decided here):**
- **Where this app physically lives on AWS** vs. `invariant-sandbox` (the existing
  AWS SaaS outer ring / BFF). The frontend transplanting into `invariant-sandbox/web`
  is one option; a standalone deploy (`MIGRATION` §6) is another. This is a
  platform-meta coordination question, flagged, not settled.
- Multi-user / collaborative sessions, the sessions service itself (`MIGRATION` gap
  B), real metering internals (gap D) — sequencing lives in the migration plan.

---

## Alternatives considered

- **Each workspace is a live kernel that executes the publishable Python directly.**
  Rejected. Either the Python is *editable-and-rerun* → the validator is dead and
  leakage is one stray `.shift(-1)` away (the exact failure class the platform
  exists to prevent); or it is *immutable-generated-from-validated-DSL* → it is just
  a slower executor with no advantage over running the DSL and *proving* the script
  matches (D2). It also makes the code generator **correctness-critical** (a codegen
  bug corrupts results, not just reading material), worsens resource control to
  bounding arbitrary Python, and turns a multi-hour session into a resident
  per-tenant process. The guarantee it chases is delivered more cheaply by the parity
  gate.
- **Ship `dsl run spec.yaml` instead of a standalone script.** Rejected as the
  *primary* receipt: trivially faithful (it *is* the executor) but illegible, drags
  an engine dependency into the reader's repo, and defeats "read it line by line"
  (you would be auditing the 56-operator engine too). Kept only as an internal
  equivalence anchor, not the published artifact.
- **Promise bit-for-bit reproducibility unconditionally.** Rejected: dishonest for
  model fits across machines (BLAS/threading). Declaring a per-node reproducibility
  class (D3) is the honest form.
- **Let the backend own `ChartSpec` / reshape the contract where convenient.**
  Rejected: violates D6 and `MIGRATION` gap C. The backend owns *data*; the frontend
  owns *figures*; `lib/types` is the contract the backend conforms to, gated.
- **Build new engine code inside this repo.** Rejected: the platform is the
  single coordinator with existing engine services (`dsl-engine`, `artifact-catalog`,
  `data-catalog`, `agent-runtime`). This backend is a **BFF over those**, never a
  fork (`MIGRATION` §2).
