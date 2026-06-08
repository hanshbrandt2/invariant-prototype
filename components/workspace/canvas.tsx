"use client";

import type { Concept, HostedDataset, LineageEdge, LineageSubgraph, ResultSpec, VariantGroup } from "@/lib/types";
import type { CanvasState, InspectTarget } from "@/components/workspace/types";
import { EmptyCanvas } from "@/components/workspace/empty-canvas";
import { WorkflowGraph } from "@/components/workspace/workflow-graph";
import { InspectorDrawer } from "@/components/workspace/inspector/inspector-drawer";

/**
 * The synthesis canvas: ONE surface. When live it is the stage-laned graph that
 * builds node-by-node, with the terminal result promoted to an inline hero.
 * Per-node detail slides in from the right (the inspector drawer) over the graph
 * — no lens switcher, no full-canvas mode swap. Code lives in the inspector's
 * Code tab + export; concepts are contextual.
 */
export function Canvas({
  canvas,
  graph,
  labels,
  producerOps,
  resultSpecs,
  datasets,
  concepts,
  variants,
  building,
  inFlightId,
  selectedNodeId,
  onPickData,
  drawer,
  drawerTab,
  onInspectNode,
  onInspectEdge,
  onCompare,
  onCloseDrawer,
  onPromote,
  onFork,
  onFlashPin,
  onOpenCode,
}: {
  canvas: CanvasState;
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  resultSpecs: Record<string, ResultSpec>;
  datasets: Record<string, HostedDataset>;
  concepts: Record<string, Concept>;
  variants: Record<string, VariantGroup>;
  building: boolean;
  inFlightId?: string | null;
  selectedNodeId?: string;
  onPickData: (id: string, label: string) => void;
  drawer: InspectTarget | null;
  drawerTab?: "overview" | "spec" | "contract" | "checks" | "code" | "lineage";
  onInspectNode: (id: string) => void;
  onInspectEdge: (e: LineageEdge) => void;
  onCompare: (nodeId: string) => void;
  onCloseDrawer: () => void;
  onPromote: (nodeId: string, value: string) => void;
  onFork: (nodeId: string) => void;
  onFlashPin?: (pinId: string) => void;
  onOpenCode?: () => void;
}) {
  const datasetList: HostedDataset[] = Array.from(new Map(Object.values(datasets).map((d) => [d.id, d])).values());

  const content =
    canvas.phase === "empty" ? (
      <EmptyCanvas datasets={datasetList} onPickData={onPickData} />
    ) : graph.nodes.length === 0 ? (
      <div className="p-10 font-mono text-sm text-muted">{building ? "building the graph…" : "no graph yet — start a build."}</div>
    ) : (
      <WorkflowGraph
        graph={graph}
        labels={labels}
        producerOps={producerOps}
        concepts={concepts}
        variants={variants}
        selectedId={selectedNodeId}
        inFlightId={inFlightId}
        onInspectNode={onInspectNode}
        onInspectEdge={onInspectEdge}
        onCompare={onCompare}
        onFork={onFork}
      />
    );

  return (
    <div className="rise flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-hairline bg-white  overflow-hidden" style={{ animationDelay: "110ms" }}>
      <div className="absolute inset-0 overflow-hidden">{content}</div>
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
          onFlashPin={onFlashPin}
          onOpenCode={onOpenCode}
        />
      )}
    </div>
  );
}
