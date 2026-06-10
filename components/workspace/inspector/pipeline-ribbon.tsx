"use client";

import type { LineageSubgraph, Node } from "@/lib/types";
import { inputsOf, outputsOf, nodeById } from "@/components/workspace/inspector/face-types";

/** A small clickable chip naming an upstream input or downstream consumer. */
function Chip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="font-mono text-meta text-ink-2 bg-paper-2 rounded-md px-2 py-1 truncate max-w-[9rem] enabled:hover:bg-paper-3 enabled:hover:text-ink transition-colors disabled:cursor-default"
      title={label}
    >
      {label}
    </button>
  );
}

/**
 * The pipeline ribbon — a compact horizontal read of where a node sits in the
 * flow: input columns → operator → this output → consumers. Names come from
 * the real lineage edges; the operator from the producer-op / spec. The output
 * carries a TIME badge because every artifact is indexed point-in-time.
 */
export function PipelineRibbon({
  node,
  graph,
  labels,
  op,
  onOpenNode,
}: {
  node: Node;
  graph: LineageSubgraph;
  labels: Record<string, string>;
  op?: string;
  onOpenNode?: (id: string) => void;
}) {
  const ins = inputsOf(graph, node.id);
  const outs = outputsOf(graph, node.id);
  const spec = node.spec as { operator?: string } | undefined;
  const operator = spec?.operator ?? op;
  const nameOf = (id: string) => nodeById(graph, id)?.name ?? labels[id] ?? id;

  return (
    <div className="rounded-lg border border-hairline bg-paper-2/40 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {/* inputs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {ins.length ? (
            ins.map((i) => <Chip key={i.id} label={nameOf(i.id)} onClick={onOpenNode ? () => onOpenNode(i.id) : undefined} />)
          ) : (
            <span className="font-mono text-meta text-faint">raw input</span>
          )}
        </div>
        <span className="font-mono text-faint shrink-0">→</span>
        {/* operator */}
        <span className="font-mono text-meta text-clay border border-clay/40 rounded-md px-2 py-1 shrink-0">
          {operator ?? node.kind}
        </span>
        <span className="font-mono text-faint shrink-0">→</span>
        {/* this output */}
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-meta text-ink bg-white border border-ink/15 rounded-md px-2 py-1">{node.name}</span>
          <span className="font-mono text-micro uppercase tracking-[0.1em] border border-[#3B6D11] text-[#3B6D11] rounded-full px-1.5 py-0.5">time</span>
        </span>
        {/* consumers */}
        {outs.length > 0 && (
          <>
            <span className="font-mono text-faint shrink-0">→</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {outs.map((id) => <Chip key={id} label={nameOf(id)} onClick={onOpenNode ? () => onOpenNode(id) : undefined} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
