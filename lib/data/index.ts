import type {
  LineageSubgraph,
  Node,
  HostedDataset,
  Workspace,
  Turn,
  StarterPrompt,
  ResultSpec,
} from "@/lib/types";
import { fig1Lineage, crudeOilLabels, crudeOilProducerOps } from "@/lib/fixtures/fig1-lineage";
import { hostedDatasets } from "@/lib/fixtures/hosted-datasets";
import { workspaces } from "@/lib/fixtures/workspaces";
import { greeting, conversationsByWorkspace } from "@/lib/fixtures/conversations";
import { starterPrompts } from "@/lib/fixtures/starter-prompts";
import { resultSpecs } from "@/lib/fixtures/result-specs";

/**
 * The only place that knows where data comes from. Fixtures-backed now,
 * `fetch()`-backed later — components read through here, never import
 * fixtures or call fetch directly. Everything is mock; there is no backend.
 */

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
  if (ref === "crude-oil-research" || ref.startsWith("result:bt_2024_06") || ref.startsWith("dataset:crude_oil"))
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

export async function getConversation(workspaceId: string): Promise<Turn[]> {
  return conversationsByWorkspace[workspaceId] ?? greeting;
}

export async function getResultSpec(id: string): Promise<ResultSpec | undefined> {
  return resultSpecs[id];
}

export function listStarterPrompts(): StarterPrompt[] {
  return starterPrompts;
}

/** Date-seeded rotation so the pick is stable within a day (no Math.random). */
export function getStarterPrompt(dateKey: string): StarterPrompt {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return starterPrompts[h % starterPrompts.length];
}
