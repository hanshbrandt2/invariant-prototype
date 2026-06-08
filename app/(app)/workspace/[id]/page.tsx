import {
  getWorkspace,
  getConversation,
  getGreeting,
  getFig1Lineage,
  getGraphPresentation,
  listHostedDatasets,
  getResultSpec,
  getCodeMap,
  getConcepts,
  getVariants,
  getSweeps,
  getInvariants,
  getConsequences,
  getVintages,
  getRecipeForWorkspace,
  getRuns,
} from "@/lib/data";
import type { Node, HostedDataset, ResultSpec } from "@/lib/types";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import type { WorkspaceBundle } from "@/components/workspace/types";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ build?: string; data?: string; view?: string; lens?: string; focus?: string; inspect?: string; compare?: string; fork?: string }>;
}) {
  const { id } = await params;
  const { build, data, view, lens, focus, inspect, compare, fork, drawertab, promote, agentic } = (await searchParams) as Record<string, string | undefined>;
  const LENSES = ["result", "graph", "code", "concepts"] as const;
  const initialLens = (LENSES as readonly string[]).includes(lens ?? "")
    ? (lens as (typeof LENSES)[number])
    : undefined;
  const isNew = id === "new";

  const ws = isNew ? undefined : await getWorkspace(id);
  // a NEW workspace starts with an EMPTY graph and accretes node-by-node as the
  // conversation builds; an existing workspace opens on its saved lineage.
  const lineage = isNew ? { nodes: [], edges: [] } : (ws?.lineage ?? (await getFig1Lineage()));
  const presentation = isNew
    ? { labels: {}, producerOps: {} }
    : await getGraphPresentation(id);
  const allDatasets = await listHostedDatasets();
  const initialTurns = isNew ? await getGreeting() : await getConversation(id);

  // node index
  const nodes: Record<string, Node> = {};
  for (const n of lineage.nodes) nodes[n.id] = n;

  // datasets keyed by raw id and by `dataset:<id>`
  const datasets: Record<string, HostedDataset> = {};
  for (const d of allDatasets) {
    datasets[d.id] = d;
    datasets[`dataset:${d.id}`] = d;
  }

  // result specs for any result nodes
  const resultSpecs: Record<string, ResultSpec> = {};
  for (const n of lineage.nodes) {
    if (n.kind === "result") {
      const spec = await getResultSpec(n.id);
      if (spec) resultSpecs[n.id] = spec;
    }
  }

  // lens content: reproducible code per node + per-kind concept text + variants
  const [code, concepts, variants] = await Promise.all([
    getCodeMap(lineage, presentation.producerOps),
    getConcepts(),
    isNew ? Promise.resolve({}) : getVariants(id),
  ]);

  // the parameter sweep (sibling results in the result lane). Surface it ALSO as
  // a result-level variant group so the hero's "compare" opens the leaderboard.
  const sweep = isNew ? undefined : await getSweeps(id);
  const [invariants, consequences, vintages] = await Promise.all([getInvariants(), getConsequences(), getVintages()]);
  const recipe = isNew ? undefined : await getRecipeForWorkspace(id);
  const runs = recipe ? await getRuns(recipe.id) : [];
  const variantsAll = sweep
    ? {
        ...variants,
        [sweep.baseId]: {
          param: sweep.param,
          knob: sweep.results.map((r) => r.value),
          chosen: sweep.results.find((r) => r.node.id === sweep.baseId)?.value ?? sweep.results[0]?.value ?? "",
          members: sweep.results.map((r) => ({ value: r.value, metrics: r.metrics })),
          bestBy: "sharpe",
        },
      }
    : variants;

  const bundle: WorkspaceBundle = {
    workspaceId: id,
    workspaceName: ws?.name ?? (isNew ? "new-analysis" : id),
    isNew,
    initialTurns,
    lineage,
    labels: presentation.labels,
    producerOps: presentation.producerOps,
    nodes,
    datasets,
    resultSpecs,
    code,
    concepts,
    variants: variantsAll,
    sweep,
    invariants,
    consequences,
    vintages,
    recipe,
    runs,
    initialPromote: promote === "1" && !!recipe,
    initialAgentic: recipe ? (agentic === "clean" ? "clean" : agentic === "1" || agentic === "halt" ? "halt" : undefined) : undefined,
    initialCodeView: view === "code",
    initialBuildPrompt: build,
    initialDataId: data,
    initialView: view === "lineage" ? "lineage" : undefined,
    initialLens,
    initialFocus: focus,
    initialDrawer: compare
      ? { type: "compare", nodeId: compare }
      : inspect?.startsWith("edge:")
        ? (() => { const [, p, c] = inspect.split(/[:|]/); return { type: "edge" as const, parentId: p, childId: c }; })()
        : inspect
          ? { type: "node", id: inspect }
          : undefined,
    initialFork: fork,
    initialDrawerTab: ["overview", "spec", "contract", "checks", "code", "lineage"].includes(drawertab ?? "") ? (drawertab as WorkspaceBundle["initialDrawerTab"]) : undefined,
  };

  return <WorkspaceClient bundle={bundle} />;
}
