import {
  getWorkspace,
  getConversation,
  getFig1Lineage,
  getGraphPresentation,
  listHostedDatasets,
  getResultSpec,
} from "@/lib/data";
import { greeting } from "@/lib/fixtures/conversations";
import type { Node, HostedDataset, ResultSpec } from "@/lib/types";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import type { WorkspaceBundle } from "@/components/workspace/types";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ build?: string; data?: string; view?: string }>;
}) {
  const { id } = await params;
  const { build, data, view } = await searchParams;
  const isNew = id === "new";

  const ws = isNew ? undefined : await getWorkspace(id);
  const lineage = ws?.lineage ?? (await getFig1Lineage());
  const presentation = await getGraphPresentation(isNew ? "crude-oil-research" : id);
  const allDatasets = await listHostedDatasets();
  const initialTurns = isNew ? greeting : await getConversation(id);

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
    initialBuildPrompt: build,
    initialDataId: data,
    initialView: view === "lineage" ? "lineage" : undefined,
  };

  return <WorkspaceClient bundle={bundle} />;
}
