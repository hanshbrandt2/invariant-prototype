"use client";

import { useMemo, useState } from "react";
import type { LineageEdge, LineageSubgraph, NodeKind, VariantGroup } from "@/lib/types";
import { knobForOp } from "@/lib/data";

const RAIL_W = 104;
const PAD = 20;
const CARD_W = 216;
const CARD_H = 58;
const VBAR_H = 22; // the ⑂ compare bar
const COL_GAP = 44;
const ROW_H = 100;

const STAGE_ORDER: NodeKind[] = ["dataset", "raw-dataset", "feature", "matrix", "target", "model", "strategy", "universe", "figure", "result"];
const KIND_TAG: Record<string, string> = {
  dataset: "DATASET", "raw-dataset": "DATASET", feature: "FEATURE", matrix: "MATRIX",
  target: "TARGET", model: "MODEL", result: "RESULT", strategy: "STRATEGY", universe: "UNIVERSE", figure: "FIGURE",
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// edge.kind → dash signature + legend label. Dash encodes the KIND of
// dependency; colour/weight (below) encodes lit-state and direction.
const EDGE_STYLE: Record<LineageEdge["kind"], { dash?: string; heavy?: boolean; label: string }> = {
  input_dependency: { label: "input" },
  training_data: { dash: "6 4", heavy: true, label: "training data" },
  input_model: { heavy: true, label: "model → result" },
  stitch_source: { dash: "2 3", label: "stitch source" },
  presentation_source: { dash: "1 4", label: "presentation" },
};

/** upstream-only closure (the causes a node depends on), excluding the node. */
function ancestorsOf(graph: LineageSubgraph, id: string): Set<string> {
  const out = new Set<string>();
  const up = (n: string) => graph.edges.forEach((e) => { if (e.childId === n && !out.has(e.parentId)) { out.add(e.parentId); up(e.parentId); } });
  up(id);
  out.delete(id);
  return out;
}

/** downstream-only closure (the effects that depend on a node), excluding it. */
function descendantsOf(graph: LineageSubgraph, id: string): Set<string> {
  const out = new Set<string>();
  const down = (n: string) => graph.edges.forEach((e) => { if (e.parentId === n && !out.has(e.childId)) { out.add(e.childId); down(e.childId); } });
  down(id);
  out.delete(id);
  return out;
}

/**
 * The Graph lens: a vertical data-flow DAG. The primary lineage is a straight
 * spine down the left; branches sit to the right and merge through a wiring
 * channel. Edges encode their KIND (dash); selecting a node cleaves its
 * upstream causes (dashed border) from its downstream effects (tinted fill).
 * A stage rail orients the read; clicking opens the drawer.
 */
export function WorkflowGraph({
  graph,
  labels,
  producerOps,
  variants,
  selectedId,
  inFlightId,
  onInspectNode,
  onInspectEdge,
  onCompare,
  onFork,
}: {
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  variants: Record<string, VariantGroup>;
  selectedId?: string;
  inFlightId?: string | null;
  onInspectNode: (id: string) => void;
  onInspectEdge: (e: LineageEdge) => void;
  onCompare: (nodeId: string) => void;
  onFork: (nodeId: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const L = useMemo(() => {
    const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
    const flow = graph.nodes.filter((n) => n.kind !== "policy");
    const parents: Record<string, string[]> = {};
    for (const n of flow) parents[n.id] = [];
    for (const e of graph.edges) if (parents[e.childId] && byId[e.parentId]?.kind !== "policy") parents[e.childId].push(e.parentId);

    const depth: Record<string, number> = {};
    const visit = (id: string, seen: Set<string>): number => {
      if (depth[id] != null) return depth[id];
      if (seen.has(id)) return 0;
      seen.add(id);
      const ps = parents[id] ?? [];
      depth[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
      return depth[id];
    };
    for (const n of flow) visit(n.id, new Set());
    const maxDepth = Math.max(0, ...flow.map((n) => depth[n.id]));

    // the spine = the primary lineage to the result (follow the deepest parent up)
    const result = flow.find((n) => n.kind === "result") ?? flow.reduce((a, b) => (depth[b.id] > depth[a.id] ? b : a), flow[0]);
    const spine = new Set<string>();
    let cur: string | undefined = result?.id;
    while (cur && !spine.has(cur)) {
      spine.add(cur);
      const ps: string[] = parents[cur] ?? [];
      cur = ps.length ? ps.reduce((a: string, b: string) => (depth[b] >= depth[a] ? b : a)) : undefined;
    }

    const rows: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
    for (const n of flow) rows[depth[n.id]].push(n.id);

    const col: Record<string, number> = {};
    rows.forEach((row) => {
      const spineNode = row.find((id) => spine.has(id));
      const others = row.filter((id) => id !== spineNode).sort((a, b) => avg(parents[a].map((p) => col[p] ?? 0)) - avg(parents[b].map((p) => col[p] ?? 0)));
      const ordered = spineNode ? [spineNode, ...others] : others;
      ordered.forEach((id, i) => (col[id] = i));
    });
    const maxCol = Math.max(0, ...Object.values(col));

    const x = (id: string) => RAIL_W + PAD + col[id] * (CARD_W + COL_GAP);
    const cx = (id: string) => x(id) + CARD_W / 2;
    const y = (id: string) => PAD + depth[id] * ROW_H;
    const bottom = (id: string) => y(id) + CARD_H + (variants[id] ? VBAR_H : 0);

    const width = RAIL_W + PAD + maxCol * (CARD_W + COL_GAP) + CARD_W + PAD + 60;
    const height = PAD * 2 + (maxDepth + 1) * ROW_H;

    // rail: anchor each stage at the row where it FIRST appears on the spine,
    // so a rail label always sits beside a card of that kind (no mixed-row mislabel)
    const spineFirstRow: Record<string, number> = {};
    for (const id of spine) {
      const k = byId[id].kind;
      spineFirstRow[k] = k in spineFirstRow ? Math.min(spineFirstRow[k], depth[id]) : depth[id];
    }
    const rail = STAGE_ORDER.filter((k) => k in spineFirstRow).map((k) => ({ kind: k, row: spineFirstRow[k] })).sort((a, b) => a.row - b.row);

    // grain (1m / 1d / …) inherited from the nearest dataset ancestor; feeds N =
    // direct downstream count. Both read off the lineage, no fabrication.
    const grainOf = (id: string): string | undefined => {
      const seen = new Set<string>();
      const stack = [id];
      while (stack.length) {
        const c = stack.pop()!;
        const node = byId[c];
        if (node && (node.kind === "dataset" || node.kind === "raw-dataset")) {
          const m = node.name.match(/(\d+[smhd])$/);
          if (m) return m[1];
        }
        for (const p of parents[c] ?? []) if (!seen.has(p)) { seen.add(p); stack.push(p); }
      }
      return undefined;
    };
    const grain: Record<string, string | undefined> = {};
    const feeds: Record<string, number> = {};
    for (const n of flow) {
      grain[n.id] = grainOf(n.id);
      feeds[n.id] = graph.edges.filter((e) => e.parentId === n.id && byId[e.childId]?.kind !== "policy").length;
    }

    // edge paths: straight only for an ADJACENT same-column step (the spine);
    // everything else routes through a gutter just right of the CHILD's column.
    const flowEdges = graph.edges.filter((e) => byId[e.parentId] && byId[e.childId] && byId[e.parentId].kind !== "policy");
    const straightEdge = (e: LineageEdge) => Math.abs(cx(e.parentId) - cx(e.childId)) < 1 && depth[e.childId] - depth[e.parentId] === 1;
    const gutterEdges = flowEdges.filter((e) => !straightEdge(e));
    const siblings = (childId: string) => gutterEdges.filter((g) => g.childId === childId);
    const paths = flowEdges.map((e) => {
      const px = cx(e.parentId), pb = bottom(e.parentId), ccx = cx(e.childId), ct = y(e.childId);
      if (straightEdge(e)) return { e, d: `M ${px} ${pb} L ${px} ${ct}` };
      const group = siblings(e.childId);
      const lane = group.indexOf(e);
      const n = group.length;
      const chX = x(e.childId) + CARD_W + 8 + lane * 7; // gutter to the right of the child column
      const entryX = ccx + (lane - (n - 1) / 2) * 16; // fan the inputs across the child's top edge
      return { e, d: `M ${px} ${pb} L ${px} ${pb + 12} L ${chX} ${pb + 12} L ${chX} ${ct - 12} L ${entryX} ${ct - 12} L ${entryX} ${ct}` };
    });

    const presentKinds = STAGE_ORDER.length ? (Object.keys(EDGE_STYLE) as LineageEdge["kind"][]).filter((k) => flowEdges.some((e) => e.kind === k)) : [];

    return { byId, flow, x, cx, y, bottom, width, height, rail, paths, grain, feeds, presentKinds };
  }, [graph, variants]);

  // hover gives a transient trace; a selected node keeps its lineage lit.
  // Split into upstream (causes) vs downstream (effects) for a directional read.
  const active = hover ?? selectedId ?? null;
  const up = active ? ancestorsOf(graph, active) : null;
  const down = active ? descendantsOf(graph, active) : null;
  const isLit = (id: string) => !active || id === active || (up?.has(id) ?? false) || (down?.has(id) ?? false);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-6 mb-6">
        <p className="text-[0.74rem] text-faint">
          {active ? "Dashed = upstream causes · tinted = downstream effects. Click to inspect." : "Hover a node to trace its path, or click to inspect."}
        </p>
        {/* edge-kind legend — only the kinds present in this graph */}
        {L.presentKinds.length > 0 && (
          <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1.5 shrink-0">
            {L.presentKinds.map((k) => (
              <span key={k} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-faint">
                <svg width="20" height="6" className="shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke="var(--color-muted)" strokeWidth={EDGE_STYLE[k].heavy ? 1.8 : 1.1} strokeDasharray={EDGE_STYLE[k].dash} />
                </svg>
                {EDGE_STYLE[k].label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="relative" style={{ width: L.width, height: L.height }}>
        {/* stage rail */}
        <div className="absolute inset-y-0 left-0" style={{ width: RAIL_W }}>
          <div className="absolute top-0 bottom-0" style={{ left: RAIL_W - 18, borderLeft: "1px solid var(--color-hairline)" }} />
          {L.rail.map((r) => (
            <div key={r.kind} className="absolute font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint" style={{ top: PAD + r.row * ROW_H + CARD_H / 2 - 6, left: 0, width: RAIL_W - 26, textAlign: "right" }}>
              {KIND_TAG[r.kind] ?? r.kind}
            </div>
          ))}
        </div>

        {/* edges */}
        <svg className="absolute inset-0" width={L.width} height={L.height} style={{ overflow: "visible" }}>
          {L.paths.map(({ e, d }, i) => {
            const st = EDGE_STYLE[e.kind];
            const litEdge = isLit(e.parentId) && isLit(e.childId);
            // direction colour relative to the active node: upstream edges (toward
            // a cause) read ink, downstream (toward an effect) read clay.
            const isUpEdge = active != null && (e.childId === active || up?.has(e.childId)) && (up?.has(e.parentId) ?? false);
            const stroke = !active || !litEdge ? "var(--color-hairline-2)" : isUpEdge ? "var(--color-ink-2)" : "var(--color-clay)";
            const w = (st.heavy ? 1.8 : 1.2) + (active && litEdge ? 0.5 : 0);
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray={st.dash} opacity={litEdge ? 1 : 0.32} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} onClick={() => onInspectEdge(e)}>
                  <title>{`${st.label} — inspect dependency`}</title>
                </path>
              </g>
            );
          })}
        </svg>

        {/* node cards */}
        {L.flow.map((n) => {
          const lit = isLit(n.id);
          const isResult = n.kind === "result";
          const isSelf = n.id === active;
          const isAncestor = up?.has(n.id) ?? false;
          const isDescendant = down?.has(n.id) ?? false;
          const isBuilding = n.id === inFlightId;
          const vg = variants[n.id];
          const knob = knobForOp(producerOps[n.id]);
          const policies = (n.policyRefs ?? []).map((pid) => labels[pid] ?? L.byId[pid]?.name ?? pid.split(":")[1]);
          // direction encoding: selected node clay-ringed; upstream causes get a
          // dashed border; downstream effects a clay tint.
          const ring =
            n.id === selectedId ? "border-clay ring-2 ring-clay/40 ring-offset-2 ring-offset-white"
            : isSelf ? "border-clay"
            : isAncestor ? "border-ink-2 border-dashed"
            : isDescendant ? "border-clay/50"
            : isResult ? "border-clay/50"
            : "border-hairline-2";
          const fill = isDescendant && active ? "bg-clay/[0.09]" : "bg-paper-2/70";
          return (
            <div
              key={n.id}
              className={`group absolute rounded-xl overflow-hidden shadow-card transition-opacity border ${fill} ${ring} ${lit ? "opacity-100" : "opacity-30"} ${isBuilding ? "node-building" : ""}`}
              style={{ left: L.x(n.id), top: L.y(n.id), width: CARD_W }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
            >
              <button onClick={() => onInspectNode(n.id)} className="block w-full text-left px-3 py-2 hover:bg-paper-2/60 transition-colors" style={{ height: CARD_H }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className={`font-mono text-[0.54rem] uppercase tracking-[0.16em] ${isResult ? "text-clay" : "text-muted"}`}>{KIND_TAG[n.kind] ?? n.kind}</span>
                    {L.grain[n.id] && <span className="font-mono text-[0.52rem] text-faint border border-hairline-2 rounded px-1 leading-[1.4]">{L.grain[n.id]}</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    {policies.map((p) => (
                      <span key={p} className="font-mono text-[0.54rem] text-clay border border-clay rounded-full px-1.5 leading-[1.5]">⚖ {p}</span>
                    ))}
                  </span>
                </div>
                <div className="mt-0.5 text-[0.88rem] text-ink leading-tight truncate">{labels[n.id] ?? n.name}</div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.6rem] text-faint truncate">{isBuilding ? "building…" : n.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {L.feeds[n.id] > 0 && <span className="font-mono text-[0.56rem] text-faint">feeds {L.feeds[n.id]}</span>}
                    {producerOps[n.id] && <span className="font-mono text-[0.6rem] text-faint">{producerOps[n.id]}</span>}
                  </span>
                </div>
              </button>
              {vg ? (
                <div className="flex border-t border-hairline bg-paper-2/40 font-mono text-[0.58rem]" style={{ height: VBAR_H }}>
                  <button onClick={() => onFork(n.id)} className="px-2.5 text-clay border-r border-hairline hover:bg-clay hover:text-paper transition-colors" title={`fork ${vg.param}`}>⑂ fork</button>
                  <button onClick={() => onCompare(n.id)} className="flex-1 flex items-center justify-between px-2.5 text-clay hover:bg-clay hover:text-paper transition-colors group/c">
                    <span>×{vg.members.length} · {vg.param}</span>
                    <span className="text-faint group-hover/c:text-paper">compare →</span>
                  </button>
                </div>
              ) : knob ? (
                <button
                  onClick={() => onFork(n.id)}
                  className="w-full text-left border-t border-hairline px-2.5 bg-paper-2/40 font-mono text-[0.58rem] text-muted hover:bg-clay hover:text-paper transition-colors opacity-0 group-hover:opacity-100 flex items-center"
                  style={{ height: VBAR_H }}
                >
                  ⑂ fork · {knob.param}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
