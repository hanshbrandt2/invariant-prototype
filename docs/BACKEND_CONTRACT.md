# Backend contract — the one seam

This frontend reads **all** data through `lib/data/index.ts`. Components never
import fixtures and never call `fetch` (audited clean — see M-F/F4). To put a
real backend behind it, you implement the functions below and flip
`NEXT_PUBLIC_DATA_SOURCE=api`. Nothing in `components/` or `app/` changes.

## How the swap works

```ts
// lib/data/index.ts
export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "fixtures";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
```

Each getter becomes a two-line dispatch, e.g.:

```ts
export async function getNode(id: string): Promise<Node | undefined> {
  if (DATA_SOURCE === "api") return apiGet(`/nodes/${encodeURIComponent(id)}`);
  return allNodes[id]; // fixtures
}
```

`apiGet` is one helper (`fetch(API_BASE_URL + path).then(r => r.json())`). The
**shapes** the backend returns are the TypeScript interfaces in
`lib/types/index.ts` — those are the contract. Keep them byte-for-byte.

## The interface a backend must satisfy

All functions are `async` and already return the exact types below.

| Function | Returns | Notes |
|---|---|---|
| `getNode(id)` | `Node \| undefined` | id = `${kind}:${name}:${version}` for artifacts |
| `listHostedDatasets()` | `HostedDataset[]` | catalog browse |
| `getHostedDataset(id)` | `HostedDataset \| undefined` | includes `sampleRows`, `columnStats`, `histograms` (a labeled snapshot, never a live query) |
| `getLineageSubgraph(ref)` | `LineageSubgraph` | `{ nodes, edges }` — edges encode DATA deps only |
| `getGraphPresentation(ref)` | `{ labels, producerOps }` | presentational sidecars, NOT contract rows |
| `listWorkspaces()` | `Workspace[]` | each carries its `lineage` (drives the card) |
| `getWorkspace(id)` | `Workspace \| undefined` | |
| `getConversation(workspaceId)` | `Turn[]` | replayed transcript |
| `getGreeting()` | `Turn[]` | opening turn for a fresh workspace |
| `getResultSpec(id)` | `ResultSpec \| undefined` | metrics + nextProposal for result nodes |
| `getConcepts()` | `Record<NodeKind, Concept>` | per-kind explainer text |
| `getVariants(workspaceId)` | `Record<string, VariantGroup>` | fork/compare groups |
| `getCodeMap(subgraph, producerOps)` | `Record<string, string>` | per-node reproducible Python |
| `searchCatalog(query)` | `SearchHit[]` | ⌘K across workspaces / artifacts / datasets |

### The build stream (`lib/sim`)

`lib/sim` is the simulated streaming backend — treat it as the spec for the real
one. Two endpoints:

- **`estimateBuild(prompt, datasetId?, existing[], horizonOverride?)`** → `BuildEstimate & { plan: BuildPlan }`.
  Decomposes the request into an ordered, **accretive** step list (steps whose
  node already exists are dropped), with per-step credits, a `big` gate flag,
  `horizonYears`, and `scopeOptions` for interactive scope-down.
- **`runBuild(plan)`** → `AsyncIterable<BuildEvent>` emitting `step_start` /
  `step_done` (each carrying the `Node` + `LineageEdge[]` to materialise) /
  `done`. The canvas grows node-by-node off this stream; the in-flight node
  pulses until `step_done`.

A real backend implements these as a streaming endpoint (SSE / WebSocket / chunked
fetch). The event shape is `BuildEvent` in `lib/types`.

## Hard invariants the backend must preserve

These are the product's promises — the frontend assumes them everywhere:

1. **Point-in-time / no lookahead.** Datasets are `pitConstruction: "point_in_time"`;
   targets are forward-shifted (`lead`). Never serve a current-snapshot value where
   a point-in-time one is claimed.
2. **Reproducibility.** `contentHash` / `lineageHash` / `producerCodeHash` pin every
   live artifact. Re-running the same recipe on the same inputs reproduces them.
3. **Operators are real.** Only operators in the confirmed registry
   (`stitch_contracts`, `derive_column`, `rolling_zscore`, `coint_spread`,
   `join_feature`, `lead`, `fit_model`, `evaluate_strategy`, …) appear in specs/code.
4. **Policies are row-level governance**, not lineage edges — they live on
   `node.policyRefs`, and `node.spec` for a policy is a `PolicySpec`.
5. **Snapshots are labeled.** Any pre-computed sample/stat/histogram is served as a
   labeled snapshot (`sample · N of M`, `pre-computed snapshot · as of <date>`),
   never implying a live aggregate.

## Deploy shape (AWS)

- **Build:** `next build` → static prerender for `/`, `/learn`, `/community`,
  `/settings`; SSR-on-demand for `/dashboard` and `/workspace/[id]`.
- **Hosting:** any Next.js-capable target (Amplify Hosting, or `next start` on
  ECS/Fargate behind an ALB, or OpenNext → CloudFront + Lambda). No server
  secrets in the frontend; the API holds auth + data.
- **Env:** `NEXT_PUBLIC_DATA_SOURCE`, `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`).
- **Auth:** `components/auth` is simulated (localStorage). Swap `login()` for real
  OAuth (Cognito / Auth0); the action-gating mechanics (`requireAuth`) are unchanged.
