"use client";

import { useEffect, useRef, useState } from "react";
import type { Concept, HostedDataset, LineageEdge, LineageSubgraph, ResultSpec, VariantGroup, SessionTree, DiveSpace } from "@/lib/types";
import type { CanvasState, InspectTarget, Lens } from "@/components/workspace/types";
import { EmptyCanvas } from "@/components/workspace/empty-canvas";
import { WorkflowGraph } from "@/components/workspace/workflow-graph";
import { WorkflowNarrative } from "@/components/workspace/workflow-narrative";
import { ConceptsLens } from "@/components/workspace/concepts-lens";
import { KIND_NOUN } from "@/components/workspace/inspector/face-types";
import { InspectorDrawer } from "@/components/workspace/inspector/inspector-drawer";

/**
 * The canvas frame: when live it tells the analysis through the chosen non-code
 * lens — Graph (the stage-laned DAG that builds node-by-node), Result (the
 * finding-led scrollable narrative), or Concepts (what each piece is). Per-node
 * detail slides in from the right (the inspector drawer) over whichever lens is
 * showing. The Code lens is a separate full-pane surface (CodeView) above this.
 */
export function Canvas({
  canvas,
  lens,
  staleIds,
  workspaceName,
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
  onPrompt,
  starterPrompts,
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
  onOpenLens,
  onNextStep,
  diveTree,
  onDive,
  onNavigateDive,
  onPin,
  morphKey,
}: {
  canvas: CanvasState;
  lens: "result" | "graph" | "concepts";
  staleIds?: Set<string>;
  workspaceName: string;
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
  onPrompt?: (prompt: string) => void;
  starterPrompts?: string[];
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
  onOpenLens?: (l: Lens) => void;
  onNextStep?: (prompt: string) => void;
  diveTree?: SessionTree | null;
  onDive?: (parentId: string, space: DiveSpace, index: number) => void;
  onNavigateDive?: (nodeId: string) => void;
  onPin?: (nodeId: string, annotation?: string) => void;
  morphKey?: string; // the current session node — changing it morphs the viewport
}) {
  const datasetList: HostedDataset[] = Array.from(new Map(Object.values(datasets).map((d) => [d.id, d])).values());

  // travel morph (ADR D2): when the current node changes, briefly play the
  // object-constancy fade-up — same DOM, so scroll/state survive (no teleport).
  const [traveling, setTraveling] = useState(false);
  const prevKey = useRef(morphKey);
  useEffect(() => {
    if (prevKey.current === morphKey) return;
    prevKey.current = morphKey;
    setTraveling(true);
    const t = setTimeout(() => setTraveling(false), 280);
    return () => clearTimeout(t);
  }, [morphKey]);

  // the live analysis told through the chosen lens (Graph / Result / Concepts)
  const liveContent =
    graph.nodes.length === 0 ? (
      <div className="p-10 font-mono text-sm text-muted">{building ? "building the graph…" : "no graph yet — start a build."}</div>
    ) : lens === "result" ? (
      <WorkflowNarrative
        graph={graph}
        labels={labels}
        producerOps={producerOps}
        resultSpecs={resultSpecs}
        datasets={datasets}
        building={building}
        buildingLabel={inFlightId ? labels[inFlightId] : undefined}
        buildingOp={inFlightId ? producerOps[inFlightId] : undefined}
        workspaceName={workspaceName}
        onOpenNode={onInspectNode}
        onOpenLens={onOpenLens}
        onNextStep={onNextStep}
        diveTree={diveTree}
        onDive={onDive}
        onNavigateDive={onNavigateDive}
        onPin={onPin}
      />
    ) : lens === "concepts" ? (
      (() => {
        const focus =
          (selectedNodeId && graph.nodes.find((n) => n.id === selectedNodeId)) ||
          [...graph.nodes].reverse().find((n) => n.kind === "result") ||
          graph.nodes[graph.nodes.length - 1];
        const seen = new Set<string>();
        const pieces = graph.nodes
          .filter((n) => {
            if (seen.has(n.kind) || !concepts[n.kind]) return false;
            seen.add(n.kind);
            return true;
          })
          .map((n) => ({ kind: KIND_NOUN[n.kind] ?? n.kind, what: concepts[n.kind].what }));
        return (
          <ConceptsLens
            focusLabel={labels[focus.id] ?? focus.name}
            focusKind={KIND_NOUN[focus.kind] ?? focus.kind}
            op={producerOps[focus.id]}
            concept={concepts[focus.kind]}
            pieces={pieces}
          />
        );
      })()
    ) : (
      <WorkflowGraph
        graph={graph}
        labels={labels}
        producerOps={producerOps}
        concepts={concepts}
        variants={variants}
        selectedId={selectedNodeId}
        inFlightId={inFlightId}
        staleIds={staleIds}
        onInspectNode={onInspectNode}
        onInspectEdge={onInspectEdge}
        onCompare={onCompare}
        onFork={onFork}
      />
    );

  const content = canvas.phase === "empty" ? <EmptyCanvas datasets={datasetList} onPickData={onPickData} onPrompt={onPrompt} starterPrompts={starterPrompts} /> : liveContent;
  // the graph manages its own pan/zoom; the scrollable narrative/concepts need overflow
  const scroll = canvas.phase === "live" && lens !== "graph";

  return (
    <div className="rise flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-hairline bg-white  overflow-hidden" style={{ animationDelay: "110ms" }}>
      <div className={`absolute inset-0 ${scroll ? "overflow-y-auto" : "overflow-hidden"} ${traveling ? "canvas-travel" : ""}`}>{content}</div>
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
