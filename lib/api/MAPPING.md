# `lib/api/` — contract reconciliation (Phase 4, Step 0)

> The output of `docs/MIGRATION_TO_BACKEND.md` §3 ("contract reconciliation — do
> this first, it's cheap"): every **read-path** `lib/types` shape diffed against the
> **real** artifact-catalog + data-catalog contracts. This is the map the `api`
> branch of `lib/data` + the route handlers will implement (ADR-0002 D6 — the
> backend conforms to `lib/types`; where it can't yet, that's a **backend ticket**,
> not a frontend hack).
>
> Last updated: 2026-06-14 · Phase 4 (read path + Slice 6 code & receipt).

## How this was obtained (and a caveat)

- **artifact-catalog** — repo source (`src/artifact_catalog/api/__init__.py` routers +
  `schemas.py` Pydantic models + `models.py` ORM). Authoritative for shapes.
- **data-catalog** — repo source (`api.py` + `schemas.py`/`models.py`). **The live
  OpenAPI at `http://ingest:8101/openapi.json` was unreachable** from fury during
  reconciliation. → **Before wiring, confirm both services are up + reachable and
  re-diff against the live `/openapi.json`** (the "is it up + fresh?" discipline).
  Source ≠ deployed until verified.
- **Auth is non-negotiable and lives in the BFF.** Every artifact-catalog call needs
  `X-Principal-Actor` / `X-Principal-Org` / `X-Principal-System` headers; reads are
  **deny-by-default** (a principal sees only its own rows + curated `platform:system`).
  The BFF holds the principal (matches invariant-sandbox's owner model); the browser
  never sees service URLs or tokens.

## Verdict legend

- ✅ **direct** — field-for-field with a casing/format transform in `lib/api/`.
- 🟡 **BFF-synthesized** — no single endpoint; the BFF composes it from real data.
- 🔴 **backend ticket** — the data does not exist server-side yet; keep the labeled
  authored snapshot until it lands (honesty bar holds).

## The four findings that matter (read these first)

1. **🔴 Workspaces do not exist in artifact-catalog.** There is no workspace
   table/endpoint. A `Workspace` (`{id,name,summary,lineage,…}`) is a *session* concept
   (agent-runtime conversations / the future sessions service, `MIGRATION` gap B) or a
   BFF projection of "a live `result` artifact + its lineage subgraph". `listWorkspaces`/
   `getWorkspace` are **synthesized**, not proxied.
2. **🔴 Result evaluation series are gap A.** `ResultSpec.equitySeries/signalSeries/
   spreadSeries/rawCandles` are not in the catalog — the catalog stores the result
   `spec` + hashes, not the pnl/eval time-series (its own note: "pnl_blob_path
   materialization deferred"). They come from the **executor's output blob in object
   storage**. Keep authored snapshots until that resolver exists.
3. **🔴 data-catalog has none of the data-legibility payload.** No `sampleRows`,
   `columnStats`, `histograms`, `preview`, `missingPct` — and **column roles
   (time/key/value) are not in the catalog** either (they live in dsl-engine/EDA). The
   catalog has dataset *metadata* (dates, row_count, schema columns); the legibility
   surface needs a separate **EDA/stats snapshot** source.
4. **🟡 The lineage subgraph is thin, kind-less, and depth-capped.**
   `GET /artifacts/{id}/lineage/subgraph` returns nodes `{id,kind,name,version,state,
   depth}` (not full `Node`) and edges `{from_id,to_id}` **without `edge_kind`**, capped
   at **depth 6**. The crude-oil chain (raw→…→result ≈ 7 hops) can hit that cap. Needs
   node hydration + an edge-kind backend ticket.

---

## Per-getter mapping

### artifact-catalog–backed

| Getter | Backend source | Mapping / transform | Verdict |
|---|---|---|---|
| `getNode(id)` | `GET /artifacts/{id}` → `ArtifactRead` | snake→camel; `content_hash→contentHash`, `lineage_hash→lineageHash`, `producer_code_hash→producerCodeHash`, `policy_refs→policyRefs`, `pit_construction→pitConstruction`, `as_of_knowledge_time→asOfKnowledgeTime`, `created_at→createdAt`. **`version` int→string.** BFF injects `source:'artifact-catalog'`. `kind`/`state` enums match **exactly**. | ✅ (1 ticket: `description`) |
| `getLineageSubgraph(ref)` | `GET /artifacts/{id}/lineage/subgraph?direction=parents` → `LineageSubgraphResult` | edges: `from_id→parentId`, `to_id→childId`; **`kind` missing → defaults to `input_dependency`** (ticket). nodes are thin → **hydrate** each via `GET /artifacts/{id}` (N+1) or accept thin. Watch **depth-6 cap**. | 🟡 + 🔴 |
| `getResultSpec(id)` | `GET /artifacts/{result_id}` → `.spec` (validated `ResultSpec`) + `.next_proposal` | `friendlyName/intendedInvariant/evalWindow/metrics/lineageRefs` unpack from `spec`; `nextProposal←next_proposal` (discriminated union **matches**, ADR-0029). **Series (equity/regime/signal/spread/raw) = gap A** → object-storage blob. | ✅ meta / 🔴 series |
| `getVariants(workspaceId)` | `GET /artifacts?name=…` (sibling forks) | No variants endpoint. BFF groups artifacts sharing a family by differing param/version, reads `metrics` from each. | 🟡 |
| `listWorkspaces()` / `getWorkspace(id)` | — (no endpoint) | **Synthesized**: a workspace = a `live` `result` artifact + `getLineageSubgraph` + session metadata. Real home = sessions service (`gap B`). | 🔴 |
| `searchCatalog(q)` | `GET /artifacts?name=` + `GET /silver-datasets?…` | No search endpoint; BFF does name-substring across list endpoints + workspaces. | 🟡 |
| `getGraphPresentation(ref)` | — | `producerOps` derivable from each node's `spec` (producing operator); `labels` from `name`/friendly. Empty maps are valid. | 🟡 (frontend-derivable) |

### data-catalog–backed

| Getter | Backend source | Mapping / transform | Verdict |
|---|---|---|---|
| `listHostedDatasets()` | `GET /hosted-indexes` (+ `GET /silver-datasets` for single instruments) | `name←description`, `schema←schema_id`, `cols←len(schema.columns)`. `assetClass←broad_class` **taxonomy map** (`commodities→energy/metals`, etc.). `rows←Σ row_count`, `coverage←min/max(first_date,last_date)` aggregated over members (**nullable/stale**). | 🟡 (aggregate + taxonomy) |
| `getHostedDataset(id)` | `GET /hosted-indexes/{name}` + `GET /schemas/{schema_id}` | `schemaFields←schema.columns` (name/type/nullable) — **but `role` (time/key/value) NOT in catalog** (ticket). `preview`, `missingPct`, **`sampleRows`/`columnStats`/`histograms`** → **none in data-catalog** (ticket: EDA/stats snapshot). | ✅ schema-meta / 🔴 legibility |

---

## Backend tickets (the honest gaps — "backend ticket, not frontend hack")

| # | Ticket | Owner repo | Blocks | Interim |
|---|---|---|---|---|
| T-1 | **Workspace projection / sessions service** (`gap B`) — where a workspace lives | sessions svc (agent-runtime ext) + BFF | `listWorkspaces`/`getWorkspace` real | BFF synthesizes from a `result` + lineage; tree stays localStorage |
| T-2 | **Result eval-series resolver** (`gap A`) — equity/signal/spread/raw from the executor's output blob in object storage | dsl-engine executor (output blob) + BFF | `getResultSpec` series + drill-to-raw | authored labeled snapshots |
| T-3 | **EDA/stats snapshot source** — `sampleRows`, `columnStats`, `histograms`, `preview`, `missingPct` for hosted datasets | new stats store / object-storage EDA + BFF | data legibility (M-A surfaces) | authored labeled snapshots |
| T-4 | **Column roles (time/key/value)** on dataset schema fields | dsl-engine / EDA → exposed via BFF | `SchemaField.role` | infer from type / leave undefined |
| T-5 | **`edge_kind` in the lineage subgraph result** (CTE drops it) | artifact-catalog | `LineageEdge.kind` fidelity | default `input_dependency` |
| T-6 | **Lineage depth > 6** (or a "fat" subgraph with hydrated nodes) | artifact-catalog | deep lineages / N+1 removal | hydrate client-side; accept cap |
| T-7 | **`Node.description`** field | artifact-catalog (or BFF from `metadata`) | `Node.description` | mock it (as today) |

None of these block the *first* read-path proof — they shape its sequencing.

---

## Re-sequenced read-path plan (cheapest **real** proof first)

`MIGRATION` §7 says "one real workspace, real artifacts, zero component changes." But
because **workspaces are synthesized** (T-1) and **datasets carry the biggest gaps**
(T-3/T-4), the most-real / least-gap first slice is the **artifact + lineage** path:

1. **Slice 1 — `getNode` + `getLineageSubgraph` against real registered artifacts.**
   Stand up `lib/api/` (the snake→camel mapper + principal headers) + `app/api/nodes/[id]`
   and `app/api/lineage/[ref]`. Point at one real `result` artifact + its upstream
   subgraph. This is the genuine end-to-end proof: real hashes, real lineage, the
   inspector + graph lens light up. (Handles T-5/T-6 with the documented defaults.)
2. **Slice 2 — `getWorkspace`/`listWorkspaces` synthesized** in the BFF (result +
   lineage + metadata) → the dashboard + workspace open against real artifacts (T-1 interim).
3. **Slice 3 — `getResultSpec` meta** (unpack `spec` + `next_proposal`); series stay
   authored (T-2) — the Result lens shows real metrics, labeled snapshot series.
4. **Slice 4 — datasets** (`listHostedDatasets`/`getHostedDataset`): metadata real
   (taxonomy + aggregate), legibility payload stays authored (T-3/T-4).

Each slice flips a subset of `lib/data` to `api` and is independently shippable
(fixtures + api can mix per-getter). Component layer never changes.

---

## Slice 6 — the ADR-0002 code & receipt (DSL codegen, `research-workbench :8105`)

The keystone made real. `research-workbench` exposes dsl-engine's codegen
(`emit → assemble_dag → build_receipt`) as two **pure / read-only** POST routes;
`lib/api/receipt.ts` maps their wire shapes into the `lib/types` contract.

| Frontend (`lib/types`) | Wire (rwb `api/dsl/schemas.py`) | Getter → route → rwb | Notes |
|---|---|---|---|
| `Receipt` `{files[], inputIds, outputNames[], reproducibilityClass, entrypoint}` | `DagReceiptResponse` `{files: dict, input_ids, output_names, reproducibility_class}` | `getLiveReceipt` → `GET /api/dsl/receipt` → `POST /api/dsl/receipt` | `files` map → ordered `ReceiptFile[]` (entrypoint first); `entrypoint` synthesized = `"pipeline.py"`; `run()` returns a dict keyed by `outputNames` (1 for single-output) |
| `AssembledCode` `{source, imports, inputIds, outputIds[], reproducibilityClass}` | `DagAssembleResponse` (same field set, snake_case) | `getLiveAssembled` → `GET /api/dsl/assemble` → `POST /api/dsl/assemble` | one runnable script (the Code lens); multi-output v2 (dsl-engine #90) |
| `ReproducibilityClass` | `Literal["bit_identical","epsilon"]` | — | the receipt's trust claim; parity gate is always bit-identical same-machine |

**The input DAG is a labelled demo (`DEMO_DAG` in `lib/api/receipt.ts`), not a
backend gap in the codegen.** Stored artifacts carry DAG-*run* metadata
(`dag_id`/`from_node`/`run_id`/`output_blob_path`), **not** the producing
`TransformNode` graph — so there is no real DAG to package from an artifact yet.
The *code & receipt are real* (live, parity-verified); only the *input* is a
placeholder. This is the artifact→TransformNode gap (task #10), and it closes
when the workspace builds the DAG itself (the **build-stream**, MIGRATION step 3),
not by a frontend workaround.

| Backend ticket | Gap | Owner | Closes |
|---|---|---|---|
| T-8 | **producing `TransformNode`/DAG on an artifact** (so a real result can emit its own receipt) | artifact-catalog + build-stream | `getCodeMap`/`getLiveReceipt` over a *real* artifact id |
| T-9 | **fill `receipt.json` `content_hash` / `vintage`** from the catalog (left null per LAW §3) | BFF / caller | a fully-pinned data manifest |

---

## Slice 7 — live data inspection (table + distributions, `research-workbench :8105`)

The data-legibility surface (the `/live/artifact/[id]` **Data** + **Distributions**
tabs). `research-workbench` is the **only** service that serves real *rows* —
artifact-catalog/data-catalog carry metadata only (T-3). `lib/api/data-inspect.ts`
maps two read-only endpoints into `lib/types`.

| Frontend (`lib/types`) | Wire (rwb `api/research`) | Getter → route → rwb | Notes |
|---|---|---|---|
| `LiveArtifactPreview` `{status, columns[], rows[][], totalRows, truncated}` | `GET /api/research/artifacts/{id}/preview?limit=` | `getLiveArtifactPreview` → `GET /api/catalog/artifacts/{id}/preview` → rwb | A **labeled SAMPLE** — first ≤`limit` rows (clean ISO). **Cap 500, no `offset`** → no row paging. `status` discriminates `200` (`ok`/`no_path`/`unsupported_format`/…) — render fallback on non-`ok`, never throw. |
| `LiveEdaSummary` `{sourceRowCount, columnStats[], histograms[]}` | `GET /api/research/eda/{id}/summary` → `EdaSummary` sidecar | `getLiveArtifactEda` → `GET /api/catalog/artifacts/{id}/eda` → rwb | Stats + histograms over the **FULL** table (pre-computed at ingest; `generatedAt` stamp, stale if the blob changed). `null` ⇒ never summarized. |

**Honesty:** the table is a *sample* (so the header says `sample · N of M`); the
distributions are *full-population* (so they say `over N rows`). Neither is
synthesized. **Wart:** rwb `str()`s datetimes in the EDA *category* values
(`"datetime.datetime(…)"`) — `artifact-charts.tsx#prettyCategory` reformats the
same value (read-only sibling repo; not a fabrication). The preview rows are
already clean ISO.

| Backend ticket | Gap | Owner | Closes |
|---|---|---|---|
| T-10 | **row paging** (`offset` on preview, or a cursor query) — to browse beyond the 500-row sample | research-workbench | full-table inspection (not just a sample) |
| T-11 | **typed datetimes in the EDA sidecar** (don't `str()` them) | research-workbench EDA | drop the `prettyCategory` client patch |
