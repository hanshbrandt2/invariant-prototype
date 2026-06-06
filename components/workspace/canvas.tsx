"use client";

import type { Concept, HostedDataset, LineageEdge, LineageSubgraph, NodeKind, ResultSpec, VariantGroup } from "@/lib/types";
import { genCodeMap, genDatasetCode } from "@/lib/data";
import type { CanvasState, InspectTarget } from "@/components/workspace/types";
import { KIND_LABEL, parseEdgeFocus } from "@/components/workspace/types";
import { EmptyCanvas } from "@/components/workspace/empty-canvas";
import { InspectorShell } from "@/components/workspace/inspector/inspector-shell";
import { DatasetOverview } from "@/components/workspace/dataset-overview";
import { CodeLens } from "@/components/workspace/code-lens";
import { ConceptsLens } from "@/components/workspace/concepts-lens";
import { WorkflowNarrative } from "@/components/workspace/workflow-narrative";
import { WorkflowGraph } from "@/components/workspace/workflow-graph";
import { faceFor } from "@/components/workspace/inspector/faces";
import type { FaceProps } from "@/components/workspace/inspector/face-types";
import { EdgeInspector } from "@/components/workspace/inspector/edge-inspector";
import { InspectorDrawer } from "@/components/workspace/inspector/inspector-drawer";

const STAGE_ORDER: NodeKind[] = ["dataset", "raw-dataset", "feature", "matrix", "target", "model", "strategy", "result", "policy"];

export function Canvas({
  canvas,
  graph,
  labels,
  producerOps,
  resultSpecs,
  datasets,
  concepts,
  variants,
  workspaceName,
  building,
  buildingStep,
  inFlightId,
  selectedNodeId,
  onOpenNode,
  onOpenLineage,
  onPickData,
  drawer,
  drawerTab,
  onInspectNode,
  onInspectEdge,
  onCompare,
  onCloseDrawer,
  onPromote,
  onFork,
}: {
  canvas: CanvasState;
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  resultSpecs: Record<string, ResultSpec>;
  datasets: Record<string, HostedDataset>;
  concepts: Record<string, Concept>;
  variants: Record<string, VariantGroup>;
  workspaceName: string;
  building: boolean;
  buildingStep: { label: string; op?: string } | null;
  inFlightId?: string | null;
  selectedNodeId?: string;
  onOpenNode: (id: string) => void;
  onOpenLineage: () => void;
  onPickData: (id: string, label: string) => void;
  drawer: InspectTarget | null;
  drawerTab?: "overview" | "spec" | "contract" | "checks" | "code" | "lineage";
  onInspectNode: (id: string) => void;
  onInspectEdge: (e: LineageEdge) => void;
  onCompare: (nodeId: string) => void;
  onCloseDrawer: () => void;
  onPromote: (nodeId: string, value: string) => void;
  onFork: (nodeId: string) => void;
}) {
  const datasetList: HostedDataset[] = Array.from(new Map(Object.values(datasets).map((d) => [d.id, d])).values());

  let content: React.ReactNode;

  if (canvas.phase === "empty") {
    content = <EmptyCanvas datasets={datasetList} onPickData={onPickData} />;
  } else {
    const { focus, lens } = canvas;
    const whole = focus === "";
    const edge = whole ? null : parseEdgeFocus(focus);
    const nodeIndex = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

    const node = whole || edge ? undefined : nodeIndex[focus];
    const dataset = whole || edge ? undefined : datasets[focus] ?? (node ? datasets[node.name] : undefined);
    const kind: NodeKind = node?.kind ?? "dataset";

    const parentNode = edge ? nodeIndex[edge.parentId] : undefined;
    const childNode = edge ? nodeIndex[edge.childId] : undefined;
    const edgeKind: LineageEdge["kind"] =
      (edge && graph.edges.find((e) => e.parentId === edge.parentId && e.childId === edge.childId)?.kind) || "input_dependency";

    const lastResult = [...graph.nodes].reverse().find((n) => n.kind === "result");
    const lastNode = graph.nodes[graph.nodes.length - 1];
    const subjectId = whole ? lastResult?.id ?? lastNode?.id ?? "" : edge ? edge.childId : focus;
    const subjectNode = nodeIndex[subjectId];
    const subjectKind: NodeKind = subjectNode?.kind ?? kind;

    const focusLabel = whole
      ? workspaceName
      : edge
        ? `${labels[edge.parentId] ?? parentNode?.name ?? "?"} → ${labels[edge.childId] ?? childNode?.name ?? "?"}`
        : labels[focus] ?? node?.name ?? dataset?.name ?? focus;

    const presentKinds = Array.from(new Set(graph.nodes.map((n) => n.kind))).sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
    const pieces = presentKinds.map((k) => ({ kind: KIND_LABEL[k] ?? k, what: concepts[k]?.what ?? "" })).filter((p) => p.what);

    const FaceComp = node ? faceFor(node.kind) : null;
    const faceProps: FaceProps | null = node
      ? { node, label: focusLabel, op: producerOps[node.id], graph, labels, producerOps, concepts, dataset, spec: resultSpecs[node.id], onOpenNode }
      : null;

    content = (
      <>
        {lens === "result" &&
          (whole ? (
            <WorkflowNarrative
              graph={graph}
              labels={labels}
              producerOps={producerOps}
              resultSpecs={resultSpecs}
              datasets={datasets}
              building={building}
              buildingLabel={buildingStep?.label}
              buildingOp={buildingStep?.op}
              workspaceName={workspaceName}
              onOpenNode={onOpenNode}
            />
          ) : edge ? (
            <EdgeInspector
              parent={parentNode}
              child={childNode}
              edgeKind={edgeKind}
              op={childNode ? producerOps[childNode.id] : undefined}
              parentLabel={labels[edge.parentId] ?? parentNode?.name ?? edge.parentId}
              childLabel={labels[edge.childId] ?? childNode?.name ?? edge.childId}
              onOpenNode={onOpenNode}
            />
          ) : node && FaceComp && faceProps ? (
            <InspectorShell kind={kind} name={focusLabel} id={focus} version={node.version} state={node.state} lineageHash={node.lineageHash} policyRefs={node.policyRefs} onOpenLineage={onOpenLineage}>
              {FaceComp(faceProps)}
            </InspectorShell>
          ) : dataset ? (
            <InspectorShell kind="dataset" name={focusLabel} id={focus} state="live" onOpenLineage={onOpenLineage}>
              <DatasetOverview dataset={dataset} />
            </InspectorShell>
          ) : (
            <div className="p-10 font-mono text-sm text-muted">node not found: {focus}</div>
          ))}

        {lens === "graph" &&
          (graph.nodes.length === 0 ? (
            <div className="p-10 font-mono text-sm text-muted">{building ? "building the graph…" : "no graph yet — start a build."}</div>
          ) : (
            <WorkflowGraph
              graph={graph}
              labels={labels}
              producerOps={producerOps}
              variants={variants}
              selectedId={selectedNodeId}
              inFlightId={inFlightId}
              onInspectNode={onInspectNode}
              onInspectEdge={onInspectEdge}
              onCompare={onCompare}
              onFork={onFork}
            />
          ))}

        {lens === "code" &&
          (() => {
            if (graph.nodes.length === 0) return <div className="p-10 font-mono text-sm text-muted">{building ? "writing the code…" : "no code yet — start a build."}</div>;
            const codeMap = genCodeMap(graph, producerOps);
            const code =
              codeMap[subjectId] ??
              (subjectNode && (subjectNode.kind === "dataset" || subjectNode.kind === "raw-dataset") ? genDatasetCode(subjectNode.name) : codeMap[lastNode?.id] ?? "# nothing built yet");
            return <CodeLens code={code} name={labels[subjectId] ?? subjectNode?.name ?? workspaceName} />;
          })()}

        {lens === "concepts" && (
          <ConceptsLens
            focusLabel={whole ? labels[subjectId] ?? subjectNode?.name ?? workspaceName : focusLabel}
            focusKind={KIND_LABEL[subjectKind] ?? subjectKind}
            op={subjectNode ? producerOps[subjectNode.id] : undefined}
            concept={concepts[subjectKind]}
            pieces={pieces}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-2xl border border-hairline bg-white shadow-soft overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto">{content}</div>
      {drawer && (
        <InspectorDrawer
          key={JSON.stringify(drawer)}
          target={drawer}
          graph={graph}
          labels={labels}
          producerOps={producerOps}
          resultSpecs={resultSpecs}
          datasets={datasets}
          concepts={concepts}
          variants={variants}
          initialTab={drawerTab}
          onClose={onCloseDrawer}
          onPromote={onPromote}
          onFork={onFork}
        />
      )}
    </div>
  );
}
