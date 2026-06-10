"use client";

import { useCallback, useEffect, useState } from "react";
import type { Concept, HostedDataset, LineageSubgraph, Node, ResultSpec, VariantGroup } from "@/lib/types";
import { genCodeMap, deriveValidator, callLine } from "@/lib/data";
import type { InspectTarget } from "@/components/workspace/types";
import { InspectorShell } from "@/components/workspace/inspector/inspector-shell";
import { EdgeInspector } from "@/components/workspace/inspector/edge-inspector";
import { faceFor } from "@/components/workspace/inspector/faces";
import { inputsOf, outputsOf, nodeById, type FaceProps } from "@/components/workspace/inspector/face-types";
import { CodeLens } from "@/components/workspace/code-lens";
import { CompareView } from "@/components/workspace/compare-view";
import { SpecTable } from "@/components/workspace/inspector/spec-table";
import { ContractTab } from "@/components/workspace/inspector/contract-tab";
import { ValidationTab, summarizeChecks } from "@/components/workspace/inspector/validation-tab";
import { PipelineRibbon } from "@/components/workspace/inspector/pipeline-ribbon";

type FaceTab = "overview" | "spec" | "contract" | "checks" | "code" | "lineage";

/** Inputs + outputs of a node, both clickable — the per-node lineage tab. */
function LineageMini({ node, graph, labels, onOpenNode }: { node: Node; graph: LineageSubgraph; labels: Record<string, string>; onOpenNode: (id: string) => void }) {
  const ins = inputsOf(graph, node.id);
  const outs = outputsOf(graph, node.id);
  const Row = ({ id }: { id: string }) => {
    const n = nodeById(graph, id);
    return (
      <button onClick={() => onOpenNode(id)} className="group flex w-full items-center gap-3 px-4 py-2.5 hover:bg-paper-2/60 transition-colors text-left">
        <span className="font-mono text-meta uppercase tracking-[0.12em] text-muted w-16 shrink-0">{n?.kind}</span>
        <span className="flex-1 min-w-0 text-ui text-ink-2 group-hover:text-ink truncate">{labels[id] ?? n?.name ?? id}</span>
        <span className="font-mono text-ui text-faint group-hover:text-clay">→</span>
      </button>
    );
  };
  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="eyebrow mb-2">built from</p>
        {ins.length ? <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">{ins.map((i) => <Row key={i.id} id={i.id} />)}</div> : <p className="text-ui text-muted">— raw input, no parents.</p>}
      </div>
      <div>
        <p className="eyebrow mb-2">feeds into</p>
        {outs.length ? <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">{outs.map((id) => <Row key={id} id={id} />)}</div> : <p className="text-ui text-muted">— terminal, nothing downstream yet.</p>}
      </div>
    </div>
  );
}

/**
 * The inspector drawer: clicking a node/edge in the Graph lens slides this in
 * from the right while the graph stays put behind it. It has its own nav stack
 * (drill via "built from" without leaving the graph); close returns you to the
 * exact graph view you were on.
 */
export function InspectorDrawer({
  target,
  graph,
  labels,
  producerOps,
  resultSpecs,
  datasets,
  concepts,
  variants,
  initialTab = "overview",
  onClose,
  onPromote,
  onFork,
  onFlashPin,
  onOpenCode,
}: {
  target: InspectTarget;
  initialTab?: FaceTab;
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  resultSpecs: Record<string, ResultSpec>;
  datasets: Record<string, HostedDataset>;
  concepts: Record<string, Concept>;
  variants: Record<string, VariantGroup>;
  onClose: () => void;
  onPromote: (nodeId: string, value: string) => void;
  onFork: (nodeId: string) => void;
  onFlashPin?: (pinId: string) => void;
  onOpenCode?: () => void;
}) {
  const [stack, setStack] = useState<InspectTarget[]>([target]);
  const [tab, setTab] = useState<FaceTab>(initialTab);
  // calm by default: only Overview shows; Spec/Contract/Checks/Code/Lineage live
  // behind one "details ▾" control (auto-open when deep-linked to a specific tab).
  const [detailsOpen, setDetailsOpen] = useState(initialTab !== "overview");
  const cur = stack[stack.length - 1];

  const push = useCallback((t: InspectTarget) => { setStack((s) => [...s, t]); setTab("overview"); setDetailsOpen(false); }, []);
  const back = useCallback(() => { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); setTab("overview"); setDetailsOpen(false); }, []);
  const openNode = useCallback((id: string) => push({ type: "node", id }), [push]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stack.length > 1) back();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stack.length, back, onClose]);

  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

  let title = "";
  let body: React.ReactNode = null;

  if (cur.type === "node") {
    const node = byId[cur.id];
    const dataset = datasets[cur.id] ?? (node ? datasets[node.name] : undefined);
    const label = labels[cur.id] ?? node?.name ?? dataset?.name ?? cur.id;
    title = label;
    if (node) {
      const Face = faceFor(node.kind);
      const isDs = node.kind === "dataset" || node.kind === "raw-dataset";
      const validator = isDs ? undefined : deriveValidator(node, graph);
      const props: FaceProps = { node, label, op: producerOps[node.id], graph, labels, producerOps, concepts, dataset, spec: resultSpecs[node.id], validator, onOpenNode: openNode };
      const hasSpec = node.spec != null && typeof node.spec === "object";
      const hasFlow = inputsOf(graph, node.id).length > 0 || outputsOf(graph, node.id).length > 0;
      const checks = summarizeChecks(node, graph);
      const TABS: { id: FaceTab; label: string }[] = [
        { id: "overview", label: "Overview" },
        ...(hasSpec ? [{ id: "spec" as FaceTab, label: "Spec" }] : []),
        { id: "contract", label: "Contract" },
        { id: "checks", label: "Checks" },
        { id: "code", label: "Code" },
        { id: "lineage", label: "Lineage" },
      ];
      // the Code tab shows the WHOLE reproducible script with this node's block lit
      const cm = genCodeMap(graph, producerOps);
      const terminal = [...graph.nodes].reverse().find((n) => n.kind === "result") ?? graph.nodes[graph.nodes.length - 1];
      const fullCode = cm[terminal?.id ?? ""] ?? cm[node.id] ?? "# nothing to reproduce";
      const nodeCode = fullCode.includes(`${node.name} =`) || fullCode.includes(`("${node.name}")`) ? fullCode : cm[node.id] ?? fullCode;
      body = (
        <InspectorShell
          kind={node.kind}
          name={label}
          id={node.id}
          version={node.version}
          state={node.state}
          op={producerOps[node.id]}
          lineageHash={node.lineageHash}
          policyRefs={node.policyRefs}
          policyLabels={labels}
          validator={validator}
          checks={isDs ? undefined : checks}
          onOpenChecks={() => { setDetailsOpen(true); setTab("checks"); }}
        >
          {isDs ? (
            Face(props)
          ) : (
            <>
              <div className="flex items-center gap-1.5 border-b border-hairline px-6 overflow-x-auto">
                <button onClick={() => setTab("overview")} className={`shrink-0 px-3 py-3 text-ui border-b-2 -mb-px transition-colors ${tab === "overview" ? "border-clay text-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}>
                  Overview
                </button>
                {detailsOpen ? (
                  TABS.filter((t) => t.id !== "overview").map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-3 py-3 text-ui border-b-2 -mb-px transition-colors ${tab === t.id ? "border-clay text-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}>
                      {t.label}
                    </button>
                  ))
                ) : (
                  <button onClick={() => setDetailsOpen(true)} title="spec · contract · checks · code · lineage" className="shrink-0 px-3 py-3 text-ui border-b-2 -mb-px border-transparent text-muted hover:text-ink">
                    details ▾
                  </button>
                )}
              </div>
              {tab === "overview" && (
                <>
                  {hasFlow && (
                    <div className="px-6 pt-5">
                      <PipelineRibbon node={node} graph={graph} labels={labels} op={producerOps[node.id]} onOpenNode={openNode} />
                    </div>
                  )}
                  {Face(props)}
                </>
              )}
              {tab === "spec" && <SpecTable spec={node.spec} />}
              {tab === "contract" && <ContractTab node={node} />}
              {tab === "checks" && <ValidationTab node={node} graph={graph} validator={validator} onFlashPin={onFlashPin} />}
              {tab === "code" && (
                <div>
                  {onOpenCode && (
                    <div className="px-6 pt-4 -mb-2">
                      <button onClick={onOpenCode} className="font-mono text-meta uppercase tracking-[0.1em] border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors">
                        open in code view →
                      </button>
                    </div>
                  )}
                  <CodeLens code={nodeCode} name={label} highlightName={node.name} />
                </div>
              )}
              {tab === "lineage" && <LineageMini node={node} graph={graph} labels={labels} onOpenNode={openNode} />}
            </>
          )}
        </InspectorShell>
      );
    } else if (dataset) {
      body = <div className="p-6 font-mono text-sm text-muted">{label}</div>;
    } else {
      body = <div className="p-6 font-mono text-sm text-muted">not found: {cur.id}</div>;
    }
  } else if (cur.type === "edge") {
    const parent = byId[cur.parentId];
    const child = byId[cur.childId];
    const edgeKind = graph.edges.find((e) => e.parentId === cur.parentId && e.childId === cur.childId)?.kind ?? "input_dependency";
    title = `${labels[cur.parentId] ?? parent?.name ?? "?"} → ${labels[cur.childId] ?? child?.name ?? "?"}`;
    // the composition: the exact pipeline.py line that builds the child from all its inputs
    const childOp = child ? producerOps[child.id] : undefined;
    const childParents = child ? graph.edges.filter((e) => e.childId === child.id).map((e) => byId[e.parentId]).filter(Boolean) : [];
    const composition = child && childOp && child.kind !== "dataset" && child.kind !== "raw-dataset" ? callLine(child, childParents, childOp) : undefined;
    body = (
      <EdgeInspector
        parent={parent}
        child={child}
        edgeKind={edgeKind}
        op={childOp}
        parentLabel={labels[cur.parentId] ?? parent?.name ?? cur.parentId}
        childLabel={labels[cur.childId] ?? child?.name ?? cur.childId}
        composition={composition}
        onOpenNode={openNode}
      />
    );
  } else {
    const node = byId[cur.nodeId];
    const group = variants[cur.nodeId];
    const label = labels[cur.nodeId] ?? node?.name ?? cur.nodeId;
    title = `compare · ${label}`;
    body = group ? (
      <CompareView group={group} nodeLabel={label} op={node ? producerOps[node.id] : undefined} onPromote={(v) => onPromote(cur.nodeId, v)} onFork={() => onFork(cur.nodeId)} />
    ) : (
      <div className="p-6 font-mono text-sm text-muted">no variants on {label}</div>
    );
  }

  return (
    <aside className="drawer-in absolute inset-y-2 right-2 z-30 w-full max-w-[528px] bg-white border border-hairline-2 rounded-lg overflow-y-auto ">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-hairline bg-white/95 backdrop-blur-sm rounded-t-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            {stack.length > 1 && (
              <button onClick={back} className="font-mono text-meta text-muted hover:text-clay">← back</button>
            )}
            {/* node faces carry their own big title below; only edge/compare need it here */}
            {cur.type !== "node" && <span className="text-ui text-ink-2 truncate">{title}</span>}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-clay text-h3 leading-none" aria-label="close">×</button>
        </div>
        {body}
    </aside>
  );
}
