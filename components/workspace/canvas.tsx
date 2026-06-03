"use client";

import type { HostedDataset } from "@/lib/types";
import type { WorkspaceBundle, CanvasView } from "@/components/workspace/types";
import type { StepState } from "@/components/workspace/workspace-client";
import { EmptyCanvas } from "@/components/workspace/empty-canvas";
import { TaskMeter } from "@/components/workspace/task-meter";
import { InspectorShell } from "@/components/workspace/inspector/inspector-shell";
import { DatasetOverview } from "@/components/workspace/dataset-overview";
import { ResultFace } from "@/components/workspace/result-face";
import { FallbackFace } from "@/components/workspace/inspector/fallback-face";
import { LineageHero } from "@/components/workspace/lineage-hero";

export function Canvas({
  view,
  bundle,
  steps,
  canBack,
  onBack,
  onOpenNode,
  onOpenLineage,
  onPickData,
}: {
  view: CanvasView;
  bundle: WorkspaceBundle;
  steps: StepState[];
  canBack: boolean;
  onBack: () => void;
  onOpenNode: (id: string) => void;
  onOpenLineage: (ref: string) => void;
  onPickData: (id: string, label: string) => void;
}) {
  const datasetList: HostedDataset[] = Array.from(
    new Map(Object.values(bundle.datasets).map((d) => [d.id, d])).values()
  );

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-paper-2">
      {view.kind === "empty" && <EmptyCanvas datasets={datasetList} onPickData={onPickData} />}

      {view.kind === "building" && <TaskMeter steps={steps} />}

      {view.kind === "lineage" && (
        <LineageHero bundle={bundle} canBack={canBack} onBack={onBack} onOpenNode={onOpenNode} />
      )}

      {view.kind === "node" &&
        (() => {
          const resolved = bundle.nodes[view.nodeId];
          if (!resolved) {
            // a dataset node that isn't in the lineage map
            const d = bundle.datasets[view.nodeId];
            if (d)
              return (
                <InspectorShell
                  kind="dataset"
                  name={d.name}
                  id={view.nodeId}
                  state="live"
                  canBack={canBack}
                  onBack={onBack}
                  onOpenLineage={() => onOpenLineage(view.nodeId)}
                >
                  <DatasetOverview dataset={d} />
                </InspectorShell>
              );
            return <div className="p-10 font-mono text-sm text-muted">node not found: {view.nodeId}</div>;
          }
          const isDataset = resolved.kind === "dataset" || resolved.kind === "raw-dataset";
          const ds = bundle.datasets[resolved.id] ?? bundle.datasets[resolved.name];
          return (
            <InspectorShell
              kind={resolved.kind}
              name={resolved.name}
              id={resolved.id}
              version={resolved.version}
              state={resolved.state}
              lineageHash={resolved.lineageHash}
              policyRefs={resolved.policyRefs}
              canBack={canBack}
              onBack={onBack}
              onOpenLineage={() => onOpenLineage(resolved.id)}
            >
              {isDataset && ds ? (
                <DatasetOverview dataset={ds} />
              ) : resolved.kind === "result" ? (
                <ResultFace node={resolved} spec={bundle.resultSpecs[resolved.id]} onOpenNode={onOpenNode} />
              ) : (
                <FallbackFace node={resolved} producerOp={bundle.producerOps[resolved.id]} />
              )}
            </InspectorShell>
          );
        })()}
    </div>
  );
}
