import type {
  LineageSubgraph,
  Node,
  HostedDataset,
  Workspace,
  Turn,
  StarterPrompt,
  ResultSpec,
  SearchHit,
} from "@/lib/types";
import { fig1Lineage, crudeOilLabels, crudeOilProducerOps } from "@/lib/fixtures/fig1-lineage";
import { hostedDatasets } from "@/lib/fixtures/hosted-datasets";
import { workspaces } from "@/lib/fixtures/workspaces";
import { greeting, conversationsByWorkspace } from "@/lib/fixtures/conversations";
import { starterPrompts } from "@/lib/fixtures/starter-prompts";
import { resultSpecs } from "@/lib/fixtures/result-specs";
import { conceptByKind } from "@/lib/fixtures/concepts";
import { buildCodeMap, datasetCode } from "@/lib/fixtures/code";
import { variantGroupsByWorkspace } from "@/lib/fixtures/variants";
import { PINS, CONSEQUENCES, VINTAGES } from "@/lib/fixtures/invariants";
import { sweepsByWorkspace } from "@/lib/fixtures/sweeps";
import { recipes as recipeCatalog } from "@/lib/fixtures/recipes-catalog";
import { runsByRecipe } from "@/lib/fixtures/runs";
import { deriveValidator } from "@/lib/validator";
import type { Concept, VariantGroup, Pin, Consequence, Vintage, Sweep, Validator, Recipe, RecipeRun } from "@/lib/types";

/**
 * The only place that knows where data comes from. Fixtures-backed now,
 * `fetch()`-backed later — components read through here, never import
 * fixtures or call fetch directly. Everything is mock; there is no backend.
 *
 * ── THE SOURCE SEAM ──────────────────────────────────────────────────────
 * Flip `DATA_SOURCE` to "api" (via NEXT_PUBLIC_DATA_SOURCE) and every getter
 * below dispatches to a real backend instead of fixtures. The whole swap is
 * this one constant + a parallel `fetch()` implementation per function — the
 * component layer never changes because it only ever sees these signatures.
 */
export const DATA_SOURCE: "fixtures" | "api" =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "fixtures";

/** Backend base URL, read only when DATA_SOURCE === "api". See .env.example
 *  and docs/BACKEND_CONTRACT.md for the interface a backend must satisfy. */
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// every node we know about, indexed by id (across all workspace lineages)
const allNodes: Record<string, Node> = (() => {
  const map: Record<string, Node> = {};
  for (const ws of workspaces) for (const n of ws.lineage.nodes) map[n.id] = n;
  for (const n of fig1Lineage.nodes) map[n.id] = n;
  return map;
})();

export async function getFig1Lineage(): Promise<LineageSubgraph> {
  return fig1Lineage;
}

/** Graph + its presentational sidecars (labels, operator verbs). */
export async function getFig1(): Promise<{
  subgraph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
}> {
  return { subgraph: fig1Lineage, labels: crudeOilLabels, producerOps: crudeOilProducerOps };
}

/** Presentational label/op maps for the crude-oil graph (used by the
 *  workspace lineage hero). Empty maps are fine for other graphs. */
export async function getGraphPresentation(ref: string): Promise<{
  labels: Record<string, string>;
  producerOps: Record<string, string>;
}> {
  if (ref === "crude-oil-research" || ref === "fig1" || ref.startsWith("result:bt_2024_06") || ref.startsWith("dataset:crude_oil"))
    return { labels: crudeOilLabels, producerOps: crudeOilProducerOps };
  return { labels: {}, producerOps: {} };
}

export async function getNode(id: string): Promise<Node | undefined> {
  return allNodes[id];
}

/** The lineage subgraph for a workspace (or the one containing a node). */
export async function getLineageSubgraph(ref: string): Promise<LineageSubgraph> {
  const ws = workspaces.find(
    (w) => w.id === ref || w.lineage.nodes.some((n) => n.id === ref)
  );
  return ws?.lineage ?? fig1Lineage;
}

export async function listHostedDatasets(): Promise<HostedDataset[]> {
  return hostedDatasets;
}

export async function getHostedDataset(id: string): Promise<HostedDataset | undefined> {
  return hostedDatasets.find((d) => d.id === id);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return workspaces;
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  return workspaces.find((w) => w.id === id);
}

// which workspace each artifact lives in (first one wins), so a search hit on a
// node can deep-link straight to its workspace + inspector.
const nodeWorkspace: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const ws of workspaces) for (const n of ws.lineage.nodes) if (!(n.id in map)) map[n.id] = ws.id;
  return map;
})();

const fmtRows = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/** ⌘K search across workspaces, artifacts, and hosted datasets. Reads the same
 *  in-memory catalog the rest of the seam serves; an API build swaps this for a
 *  single `fetch('/search?q=')`. */
export async function searchCatalog(query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const ws of workspaces) {
    if (ws.name.toLowerCase().includes(q) || ws.summary.toLowerCase().includes(q)) {
      hits.push({ type: "workspace", id: ws.id, title: ws.name, subtitle: ws.summary, href: `/workspace/${ws.id}` });
    }
  }
  for (const d of hostedDatasets) {
    if (d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.assetClass.includes(q)) {
      hits.push({ type: "dataset", id: d.id, title: d.name, subtitle: `${d.assetClass} · ${fmtRows(d.rows)} rows · ${d.id}`, href: `/workspace/new?data=${d.id}` });
    }
  }
  for (const id in allNodes) {
    const n = allNodes[id];
    if (n.kind === "dataset" || n.kind === "raw-dataset") continue; // datasets covered above
    const label = crudeOilLabels[id];
    if (n.name.toLowerCase().includes(q) || (label ?? "").toLowerCase().includes(q) || n.kind.includes(q)) {
      const ws = nodeWorkspace[id] ?? "crude-oil-research";
      hits.push({
        type: "artifact",
        id,
        title: label ?? n.name,
        subtitle: `${n.kind}${n.version ? ` · ${n.version}` : ""} · ${ws}`,
        href: `/workspace/${ws}?lens=graph&inspect=${encodeURIComponent(id)}`,
      });
    }
  }
  return hits.slice(0, 24);
}

export async function getConversation(workspaceId: string): Promise<Turn[]> {
  return conversationsByWorkspace[workspaceId] ?? greeting;
}

/** The opening assistant turn for a fresh workspace — served through the seam
 *  so the workspace page never reaches into fixtures. */
export async function getGreeting(): Promise<Turn[]> {
  return greeting;
}

export async function getResultSpec(id: string): Promise<ResultSpec | undefined> {
  return resultSpecs[id];
}

/** Per-kind concept text for the Concepts lens. */
export async function getConcepts(): Promise<Record<string, Concept>> {
  return conceptByKind;
}

/** Variant groups (forks) for a workspace — drives the ⑂×N badges + Compare. */
export async function getVariants(workspaceId: string): Promise<Record<string, VariantGroup>> {
  return variantGroupsByWorkspace[workspaceId] ?? {};
}

/** The contract layer — the pinned invariants ("laws") for a canvas. Workspace-
 *  agnostic in the mock; a real backend scopes the pin set per workspace. */
export async function getInvariants(): Promise<Pin[]> {
  return PINS;
}

/** What the pinned laws DO to a build — the consequences strip. */
export async function getConsequences(): Promise<Consequence[]> {
  return CONSEQUENCES;
}

/** The revision-bearing vintage series for the As-of pin's slider. */
export async function getVintages(): Promise<Vintage[]> {
  return VINTAGES;
}

/** The parameter sweep for a workspace — N sibling results in one lane. */
export async function getSweeps(workspaceId: string): Promise<Sweep | undefined> {
  return sweepsByWorkspace[workspaceId];
}

/** Saved recipes — validated, parameterised workflows (the Templates shelf). */
export async function listRecipes(): Promise<Recipe[]> {
  return recipeCatalog;
}

/** A recipe crystallised from a workspace (used by the Promote panel). */
export async function getRecipeForWorkspace(workspaceId: string): Promise<Recipe | undefined> {
  return recipeCatalog.find((r) => r.workspaceId === workspaceId);
}

/** The Runs history (audit log) for one recipe — newest first. */
export async function getRuns(recipeId: string): Promise<RecipeRun[]> {
  return [...(runsByRecipe[recipeId] ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Every recipe's runs, keyed by recipe id — drives the dashboard shelf's
 *  per-card run summary without N round-trips. */
export async function listRunsByRecipe(): Promise<Record<string, RecipeRun[]>> {
  return runsByRecipe;
}

/** The single validator object for one artifact (derived from the lineage). */
export async function getValidator(id: string): Promise<Validator | undefined> {
  const node = allNodes[id];
  if (!node) return undefined;
  const graph = await getLineageSubgraph(id);
  return deriveValidator(node, graph);
}

/** Sync validator derivation + the rolled-up verdict for the client-grown graph
 *  — re-exported through the seam so components read it like everything else. */
export { deriveValidator, validatorOk } from "@/lib/validator";

/** Reproducible Python per node in a subgraph (Code lens). */
export async function getCodeMap(
  subgraph: LineageSubgraph,
  producerOps: Record<string, string>
): Promise<Record<string, string>> {
  return buildCodeMap(subgraph, producerOps);
}

/** Standalone load snippet for a hosted dataset not yet in a lineage. */
export function getDatasetCode(id: string): string {
  return datasetCode(id);
}

/** Sync codegen for the live (client-grown) graph — used by the Code lens.
 *  Re-exported through the data seam so components never import fixtures. */
export { buildCodeMap as genCodeMap, datasetCode as genDatasetCode, buildPipeline, callLine, opLabel } from "@/lib/fixtures/code";

/** Fork helpers (typed knobs, current value, generated metrics) — re-exported
 *  through the seam so components never import fixtures directly. */
export { knobForOp, inferCurrent, genMetrics } from "@/lib/fixtures/variants";

export function listStarterPrompts(): StarterPrompt[] {
  return starterPrompts;
}

/** Date-seeded rotation so the pick is stable within a day (no Math.random). */
export function getStarterPrompt(dateKey: string): StarterPrompt {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return starterPrompts[h % starterPrompts.length];
}
