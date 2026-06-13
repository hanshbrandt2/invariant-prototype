# The keystone — the parity-verified code emitter + the reproducibility receipt

> The design spec for ADR-0002's **keystone**: the one piece that turns the Code
> lens from a beautiful attestation into a *falsifiable* guarantee — *"publish it,
> bring your data, re-run it anywhere, get the same numbers."* This lives in
> `dsl-engine` (it owns the executor + operators); it is specified here because
> `invariant` is the architecture of record (ADR-0002) and `getCodeMap` is the
> frontend contract it must satisfy.
>
> Status: **Proposed** — design only. Implementation is a `dsl-engine` Pattern-A
> change. Last updated: 2026-06-13.

## Why this is the keystone

The product promise (`ROADMAP.md`) is *"every result is traceable to code you can
run yourself."* Today the Code lens shows real, pip-installable Python, but it is
**rendered from the lineage and never executed** — *plausible*, not *verified*.
Meanwhile the executor runs a different thing (in-memory Polars expressions). Two
code paths that are *assumed* equal is exactly the drift ADR-0002 forbids.

The fix is not "execute the published Python" (that surrenders the validator — see
ADR-0002 alternatives). It is: **make the published code a proven-faithful rendering
of what executed** — `emit() ≡ execute()`, gated per operator.

## Decision 1 — every operator emits its own source, gated against its own compiler

`dsl-engine` operators already implement a **codegen compiler** (`get_compiler(op)` →
builds `polars.Expr` for execution). Add a second rendering off the *same* operator
definition:

```python
class BaseOperatorCompiler:
    def compile(self, node, inputs) -> pl.Expr | Frame:   # EXISTING — what runs
        ...
    def emit(self, node, ctx: EmitCtx) -> EmittedOp:      # NEW — what publishes
        """Return standalone, dependency-light Python source (polars/numpy/sklearn)
        for this node, written against the INPUT SCHEMA — no engine import, no
        storage paths. Shares the parsed AST / params with compile()."""
```

`EmittedOp` carries: the source lines, the imports it needs, and the input/output
frame names — so the assembler can stitch nodes into one `invariant_research/`
package (the shape `invariant`'s `lib/fixtures/code.ts` already prototypes:
`data.py` loader · `features.py` · `targets.py` · `models.py` · `strategy.py` ·
`pipeline.py` · `pyproject.toml` · pinned `requirements.txt`).

**The closed expression sub-grammar makes this tractable:** `derive_column` /
`filter` already parse to one shared AST that both the validator and the Polars
compiler consume; `emit()` is a third consumer of that same AST. Forbidden forms
(`lead|lag|shift|next|prev|future`, attribute access, indexing) are unspeakable in
the grammar, so emitted code inherits the leakage-safety of the validated spec.

## Decision 2 — the parity gate (the thing that makes it real)

For **every operator**, a CI test asserts the emitted standalone code produces the
**same output** as the in-process compiler on fixture data:

```
run_batch(spec, fixtures)              -> executor_output      # what runs
exec(assemble(emit(spec)), fixtures)   -> emitted_output       # what publishes
assert parity(executor_output, emitted_output, op.repro_class)
```

This rides on the **per-operator determinism contract test `dsl-engine` already
requires** for every Tier-1 operator — it is one more assertion on an existing
test, not a new discipline. `parity(...)` is exact or ε-tolerant per Decision 3.

Guarantee: `emit()` is a *verified* projection of `execute()`, forever, enforced by
red CI. A codegen bug breaks the *gate* (caught), never silently corrupts results —
because the executor, not the emitted code, still produces the numbers on-platform.

## Decision 3 — two reproducibility classes (honest about floating point)

Cross-environment bit-identity is **not** free. Declare a class per node:

- **`bit_identical`** — deterministic dataframe ops (filter, rolling, asof, join,
  derive, rank, unique) under a pinned lockfile. The bulk of the 56 operators.
- **`epsilon(tol)`** — linear-algebra / model fits (kalman, garch, coint,
  `fit_model`, `evaluate_strategy`): multithreaded BLAS reduction order drifts the
  last bits across machines. Bit-identical only within the *same* pinned env;
  numerically-equal-within-ε across machines. Carries the tolerance.

The receipt **declares** the class per node rather than pretending "exact" and then
disagreeing in the 14th decimal on someone's laptop.

## Decision 4 — the receipt bundle (what `getCodeMap` actually returns)

A trustworthy, portable receipt = **code + lockfile + data manifest + class**:

| Part | Source | Notes |
|---|---|---|
| **Standalone script** (`invariant_research/`) | the assembled `emit()` output | parity-verified; legible; zero engine dependency |
| **Lockfile** | pinned deps (`requirements.txt`/`uv.lock`) | the prototype already pins polars/numpy/sklearn; platform ADR-0048 |
| **Data manifest** | per input: instruments · date range · **vintage** (`as_of_knowledge_time`) · `content_hash` | content-addressed; honors no-look-ahead (ADR-0023). data-catalog holds *definitions*, so the manifest pins the values' hash, not a path |
| **Reproducibility class** | per node (Decision 3) | `bit_identical` / `epsilon(tol)` |
| **Pins** | `producer_code_hash` · `content_hash` · `lineage_hash` | already on the `Node` contract |

This is also the **clone-to-production** artifact (ADR-0002 D5): you lift the
receipt into your own engine; the measurability classes (`causal_finite` vs
`walk_forward`) tell you what is safe to run *online*.

## How the frontend consumes it (no drift)

- `getCodeMap(subgraph, producerOps)` → `Record<nodeId, string>` stays byte-for-byte
  (BACKEND_CONTRACT). The BFF fills it from `dsl-engine`'s emitter instead of the
  fixture template — a data-source swap behind the one seam.
- A receipt endpoint (new, additive) serves the lockfile + data manifest + classes
  for the "Export / Push to GitHub" flow (`ROADMAP.md` M-E, today honestly stubbed).

## Sequencing (the dsl-engine Pattern-A work)

1. `emit()` for the **confirmed-registry operators the frontend already names**
   (`stitch_contracts`, `derive_column`, `rolling_zscore`, `coint_spread`,
   `join_feature`, `lead`, `fit_model`, `evaluate_strategy`) — the path the Code
   lens shows first.
2. The parity gate wired into the existing per-operator determinism tests
   (`bit_identical` first; `epsilon` for the model-fit operators).
3. The assembler (`emit()` nodes → `invariant_research/` package) + the receipt
   bundle (lockfile + data manifest + classes).
4. Wire `getCodeMap` (+ the receipt endpoint) in the BFF; flip `invariant`'s Code
   lens / Export from fixture to live behind the seam.

Steps 1–3 are `dsl-engine`; step 4 is the BFF + this repo. Each operator's `emit()`
+ parity assertion is an independently reviewable unit — **1 operator = 1 PR**.

## Relationship to the build-stream (MIGRATION step 3)

The build-stream (`estimateBuild`/`runBuild` → `BuildEvent`s) needs the `dsl-engine`
**executor** (today a skeleton) regardless of the emitter. The emitter (this doc) is
what makes each materialized node's **code** trustworthy; the executor is what
**runs** the DAG. Both are `dsl-engine` Pattern-A work and are the gate for
`invariant`'s Phase-4 build-stream slice.
