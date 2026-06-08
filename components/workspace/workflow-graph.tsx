"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Concept, LineageEdge, LineageSubgraph, NodeKind, ResultSpec, Sweep, Validator, VariantGroup } from "@/lib/types";
import { STAGE_LANES, STAGE_OF_KIND } from "@/lib/types";
import { knobForOp, deriveValidator } from "@/lib/data";
import { TrustBadge } from "@/components/workspace/trust-badge";
import { Metric } from "@/components/workspace/metric";

/* ── geometry ──────────────────────────────────────────────────────────────
   HORIZONTAL = pipeline stage (bounded lanes, left→right). A node's lane is
   LOCKED to its kind. VERTICAL = research breadth: the spine runs along one
   centerline; branches distribute ABOVE and BELOW it (balanced, not bottom-
   heavy); sweep siblings stack beneath the hero. The whole thing fits to the
   viewport by default (zoom), so the story reads in one glance. */
const LANE_W = 184; // lane stride — must exceed CARD_W (gutter for edges + routing)
const PAD_X = 22;
const PAD_TOP = 24;
const CARD_W = 150; // a node card (gutter to next lane = LANE_W − CARD_W = 34)
const CARD_H = 44; // two info lines (name + operator/grain/feeds)
const ACT_H = 16; // the always-visible action row (fork / compare), when present
const HERO_W = 178; // the finding — fits within its lane (no overflow)
const HERO_H = 104; // no chart — name + the metrics, clean
const ROW_H = 76; // vertical stride — exceeds the tallest card (CARD_H + ACT_H)
const SIB_H = 40;
const SIB_GAP = 8;

// strip a trailing grain suffix ("· 1m") from a label — the grain shows on its
// own line, so it shouldn't be doubled in the name.
const cleanName = (s: string) => s.replace(/\s*·\s*\d+[smhd]$/, "");

const STAGE_TAG: Record<string, string> = {
  dataset: "DATASET", feature: "FEATURE", matrix: "MATRIX", target: "TARGET", model: "MODEL", result: "RESULT", analysis: "ANALYSIS",
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (z: number, lo = 0.4, hi = 2) => Math.min(hi, Math.max(lo, z));

/** An orthogonal polyline (right-angle segments) with rounded corners — clean,
 *  circuit-like connectors that fit the lane grid far better than swooping
 *  beziers. `pts` are the corner points; corners are filleted with radius r. */
function roundedOrtho(pts: [number, number][], r = 7): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0) || 1;
    const d2 = Math.hypot(x2 - x1, y2 - y1) || 1;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = x1 - ((x1 - x0) / d1) * rr, ay = y1 - ((y1 - y0) / d1) * rr;
    const bx = x1 + ((x2 - x1) / d2) * rr, by = y1 + ((y2 - y1) / d2) * rr;
    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  d += ` L ${lx.toFixed(1)} ${ly.toFixed(1)}`;
  return d;
}

// edge.kind → dash signature + legend label. Dash encodes the KIND of dependency.
const EDGE_STYLE: Record<LineageEdge["kind"], { dash?: string; heavy?: boolean; label: string }> = {
  input_dependency: { label: "input" },
  training_data: { dash: "6 4", heavy: true, label: "training data" },
  input_model: { heavy: true, label: "model → result" },
  stitch_source: { dash: "2 3", label: "stitch source" },
  presentation_source: { dash: "1 4", label: "presentation" },
};

function ancestorsOf(graph: LineageSubgraph, id: string): Set<string> {
  const out = new Set<string>();
  const up = (n: string) => graph.edges.forEach((e) => { if (e.childId === n && !out.has(e.parentId)) { out.add(e.parentId); up(e.parentId); } });
  up(id);
  out.delete(id);
  return out;
}
function descendantsOf(graph: LineageSubgraph, id: string): Set<string> {
  const out = new Set<string>();
  const down = (n: string) => graph.edges.forEach((e) => { if (e.parentId === n && !out.has(e.childId)) { out.add(e.childId); down(e.childId); } });
  down(id);
  out.delete(id);
  return out;
}

const laneOf = (kind: NodeKind): number => {
  const s = STAGE_OF_KIND[kind];
  return s ? STAGE_LANES.indexOf(s) : -1;
};

/**
 * The canvas: a stage-laned, append-only record of the build. The SPINE (the
 * lineage to the result) is drawn ink + solid along the centerline; branches
 * recede (faint, thin) above and below it, so the eye follows data→finding
 * effortlessly. The terminal result is the inline HERO. Fits to view by default
 * with zoom + a minimap; a leak renders as a flagged BACKWARD edge.
 */
export function WorkflowGraph({
  graph,
  labels,
  producerOps,
  resultSpecs,
  concepts,
  variants,
  sweep,
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
  resultSpecs: Record<string, ResultSpec>;
  concepts: Record<string, Concept>;
  variants: Record<string, VariantGroup>;
  sweep?: Sweep;
  selectedId?: string;
  inFlightId?: string | null;
  onInspectNode: (id: string) => void;
  onInspectEdge: (e: LineageEdge) => void;
  onCompare: (nodeId: string) => void;
  onFork: (nodeId: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [explain, setExplain] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [vp, setVp] = useState({ l: 0, t: 0, w: 0, h: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const L = useMemo(() => {
    const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
    const flow = graph.nodes.filter((n) => laneOf(n.kind) >= 0);
    const parents: Record<string, string[]> = {};
    for (const n of flow) parents[n.id] = [];
    for (const e of graph.edges) if (parents[e.childId] && laneOf(byId[e.parentId]?.kind ?? "operator") >= 0) parents[e.childId].push(e.parentId);

    // the spine = the primary lineage to the result (follow the deepest-lane parent up)
    const result = flow.find((n) => n.kind === "result") ?? flow.reduce((a, b) => (laneOf(b.kind) > laneOf(a.kind) ? b : a), flow[0]);
    const spine = new Set<string>();
    const spineOrder: Record<string, number> = {};
    let cur: string | undefined = result?.id;
    let order = 0;
    while (cur && !spine.has(cur)) {
      spine.add(cur);
      spineOrder[cur] = order++;
      const ps: string[] = parents[cur] ?? [];
      cur = ps.length ? ps.reduce((a, b) => (laneOf(byId[b].kind) >= laneOf(byId[a].kind) ? b : a)) : undefined;
    }

    // vertical rank: the lane's representative spine node sits on the centerline
    // (rank 0); branches distribute ABOVE and BELOW it (−1,+1,−2,+2…), ordered
    // by their parents' barycenter so edges cross as little as possible.
    const rank: Record<string, number> = {};
    const byLane: Record<number, string[]> = {};
    for (const n of flow) (byLane[laneOf(n.kind)] ??= []).push(n.id);
    Object.keys(byLane)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((lane) => {
        const ids = byLane[lane];
        // the centered spine node = the spine member nearest the result
        const spineIds = ids.filter((id) => spine.has(id)).sort((a, b) => spineOrder[a] - spineOrder[b]);
        const pivot = spineIds[0];
        const others = ids
          .filter((id) => id !== pivot)
          .sort((a, b) => avg(parents[a].map((p) => rank[p] ?? 0)) - avg(parents[b].map((p) => rank[p] ?? 0)));
        if (pivot) {
          rank[pivot] = 0;
          // alternate the branches around the spine: +1, −1, +2, −2, …
          others.forEach((id, i) => (rank[id] = (i % 2 === 0 ? 1 : -1) * Math.ceil((i + 1) / 2)));
        } else {
          // no spine node in this lane — just center the group
          others.forEach((id, i) => (rank[id] = i - Math.floor((others.length - 1) / 2)));
        }
      });

    const ranks = Object.values(rank);
    const minRank = Math.min(0, ...ranks);
    const maxRank = Math.max(0, ...ranks);
    const aboveNeed = Math.max(HERO_H / 2, -minRank * ROW_H + CARD_H / 2);
    const belowNeed = Math.max(HERO_H / 2, maxRank * ROW_H + CARD_H / 2);
    const SPINE_Y = PAD_TOP + aboveNeed;

    const laneX = (lane: number) => PAD_X + lane * LANE_W;
    const isHero = (id: string) => byId[id]?.kind === "result" && spine.has(id) && !!resultSpecs[id];
    // nodes with an always-visible fork/compare row are a touch taller
    const forkable = new Set(flow.filter((n) => variants[n.id] || knobForOp(producerOps[n.id])).map((n) => n.id));
    const cardW = (id: string) => (isHero(id) ? HERO_W : CARD_W);
    const cardH = (id: string) => (isHero(id) ? HERO_H : forkable.has(id) ? CARD_H + ACT_H : CARD_H);
    const cx = (id: string) => laneX(laneOf(byId[id].kind));
    const cyOf = (id: string) => SPINE_Y + (rank[id] ?? 0) * ROW_H;
    const left = (id: string) => cx(id);
    const right = (id: string) => cx(id) + cardW(id);
    const top = (id: string) => cyOf(id) - cardH(id) / 2;

    const heroId = result && isHero(result.id) ? result.id : undefined;
    const siblings = sweep && sweepOpen && heroId ? sweep.results.filter((r) => r.node.id !== sweep.baseId) : [];
    const sibTop = (i: number) => (heroId ? top(heroId) + HERO_H + SIB_GAP + i * (SIB_H + SIB_GAP) : 0);

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
      feeds[n.id] = graph.edges.filter((e) => e.parentId === n.id && laneOf(byId[e.childId]?.kind ?? "operator") >= 0).length;
    }

    // edges: routed so they connect at card EDGES and never cut through a card.
    //  · forward (left→right): a bezier that ARCS below any lane it spans;
    //  · same-lane chain: a vertical hop bowed into the left gutter;
    //  · backward (reads a later stage): a leak — flagged, arcs up.
    const flowEdges = graph.edges.filter((e) => byId[e.parentId] && byId[e.childId] && laneOf(byId[e.parentId].kind) >= 0 && laneOf(byId[e.childId].kind) >= 0);
    const GUT = (LANE_W - CARD_W) / 2; // half the inter-lane gutter (the routing channel)
    const paths = flowEdges.map((e) => {
      const pl = laneOf(byId[e.parentId].kind);
      const cl = laneOf(byId[e.childId].kind);
      const py = cyOf(e.parentId);
      const cy = cyOf(e.childId);
      const spineEdge = spine.has(e.parentId) && spine.has(e.childId);
      let d: string;
      let back = false;
      if (cl === pl) {
        // vertical chain within a lane — a straight hop, centre-to-centre,
        // between the facing edges of the two stacked cards
        const cxv = left(e.parentId) + CARD_W / 2;
        const down = cy > py;
        const y0 = down ? top(e.parentId) + cardH(e.parentId) : top(e.parentId);
        const y1 = down ? top(e.childId) : top(e.childId) + cardH(e.childId);
        d = `M ${cxv} ${y0} L ${cxv} ${y1}`;
      } else if (cl > pl) {
        const px = right(e.parentId), ccx = left(e.childId);
        if (cl - pl >= 2) {
          // skips a lane — drop into a routing band BELOW the cards, then rise
          const dipY = Math.max(py, cy) + CARD_H / 2 + 16;
          d = roundedOrtho([[px, py], [px + GUT, py], [px + GUT, dipY], [ccx - GUT, dipY], [ccx - GUT, cy], [ccx, cy]]);
        } else if (Math.abs(py - cy) < 1) {
          d = `M ${px} ${py} L ${ccx} ${cy}`; // straight — same row, next lane
        } else {
          const chX = (px + ccx) / 2; // elbow through the gutter channel
          d = roundedOrtho([[px, py], [chX, py], [chX, cy], [ccx, cy]]);
        }
      } else {
        // backward (a leak) — route up into a band ABOVE the cards, flagged
        back = true;
        const px = left(e.parentId), ccx = right(e.childId);
        const upY = Math.min(py, cy) - CARD_H / 2 - 16;
        d = roundedOrtho([[px, py], [px - GUT, py], [px - GUT, upY], [ccx + GUT, upY], [ccx + GUT, cy], [ccx, cy]]);
      }
      return { e, d, back, spineEdge };
    });

    const width = PAD_X * 2 + STAGE_LANES.length * LANE_W;
    const sibBottom = siblings.length ? sibTop(siblings.length - 1) + SIB_H : 0;
    const height = Math.max(SPINE_Y + belowNeed + 28, sibBottom + 28);
    const presentKinds = (Object.keys(EDGE_STYLE) as LineageEdge["kind"][]).filter((k) => flowEdges.some((e) => e.kind === k));

    return { byId, flow, spine, laneX, cx, cyOf, left, right, top, cardW, cardH, isHero, heroId, forkable, siblings, sibTop, grain, feeds, paths, width, height, presentKinds };
  }, [graph, resultSpecs, sweep, sweepOpen, variants, producerOps]);

  const active = hover ?? selectedId ?? null;
  const up = active ? ancestorsOf(graph, active) : null;
  const down = active ? descendantsOf(graph, active) : null;
  const isLit = (id: string) => !active || id === active || (up?.has(id) ?? false) || (down?.has(id) ?? false);

  const syncVp = useCallback(() => {
    const el = scrollRef.current;
    if (el) setVp({ l: el.scrollLeft, t: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
  }, []);

  // hold current content dims in a ref so `fit` stays STABLE — otherwise it
  // would re-fire as the graph grows mid-build and fight the follow-scroll.
  const dims = useRef({ w: L.width, h: L.height });
  useEffect(() => { dims.current = { w: L.width, h: L.height }; }, [L.width, L.height]);

  // fit the whole pipeline to the viewport, anchored at the START (data, top-left)
  const fit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const z = Math.min((el.clientWidth - 28) / dims.current.w, (el.clientHeight - 28) / dims.current.h, 1.1);
    setZoom(clamp(z, 0.45, 1.1));
    el.scrollTo({ left: 0, top: 0 });
    syncVp();
  }, [syncVp]);

  // fit on mount + on container resize (NOT on graph growth mid-build)
  useEffect(() => { fit(); }, [fit]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // follow the build: keep the in-flight node in view as the graph accretes L→R.
  useEffect(() => {
    if (!inFlightId) return;
    const el = inFlightId === L.heroId ? heroRef.current : nodeRefs.current[inFlightId];
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [inFlightId, L.heroId]);

  const nodeValidator = (id: string): Validator | undefined => {
    const n = L.byId[id];
    if (!n || n.kind === "dataset" || n.kind === "raw-dataset") return undefined;
    return deriveValidator(n, graph);
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* header — fixed above the scroll area */}
      <div className="shrink-0 flex items-start justify-between gap-6 px-5 pt-4 pb-3 md:px-7">
        <p className="text-[0.74rem] text-faint">
          {active ? "Dashed = upstream causes · tinted = downstream effects. Click to inspect." : "The ink line is the main path, data → finding · branches sit lighter. Hover to trace, click to inspect."}
        </p>
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setExplain((e) => !e)}
            aria-pressed={explain}
            title="explain each kind in context"
            className={`font-mono text-[0.58rem] uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${explain ? "bg-ink text-paper border-ink" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
          >
            explain
          </button>
          {L.presentKinds.length > 0 && (
            <div className="hidden lg:flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
      </div>

      {/* the scroll area — owns pan; content is scaled by `zoom`, and vertically
          centered when it's shorter than the viewport (no dead space below) */}
      <div ref={scrollRef} onScroll={syncVp} className="relative flex-1 overflow-auto p-3">
        <div className="flex min-h-full items-center">
          <div style={{ width: L.width * zoom, height: L.height * zoom, flexShrink: 0 }}>
            <div className="relative" style={{ width: L.width, height: L.height, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            {/* stage-lane guides */}
            {STAGE_LANES.map((stage, i) => {
              const designed = stage === "analysis";
              return (
                <div key={stage} className="absolute top-0 bottom-0" style={{ left: L.laneX(i) - 13, width: LANE_W }}>
                  <div className="absolute top-0 bottom-0 left-0 border-l" style={{ borderColor: "var(--color-hairline)", borderLeftStyle: designed ? "dashed" : "solid" }} />
                  <div className="absolute top-0 left-0 flex items-center gap-1.5" style={{ paddingLeft: 13 }}>
                    <span className={`font-mono text-[0.56rem] uppercase tracking-[0.16em] ${designed ? "text-faint/70" : "text-faint"}`}>{STAGE_TAG[stage]}</span>
                    {designed && <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-faint/70 border border-dashed border-hairline-2 px-1 leading-[1.5]">designed</span>}
                  </div>
                </div>
              );
            })}

            {/* edges */}
            <svg className="absolute inset-0" width={L.width} height={L.height} style={{ overflow: "visible" }}>
              <defs>
                {/* markerUnits=userSpaceOnUse → a FIXED small arrowhead, not one
                    that grows with stroke width */}
                {([["dim", "var(--color-hairline-2)"], ["ink", "var(--color-ink-2)"], ["clay", "var(--color-clay)"]] as const).map(([id, c]) => (
                  <marker key={id} id={`ar-${id}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
                    <path d="M0,0.5 L5,3 L0,5.5 Z" style={{ fill: c }} />
                  </marker>
                ))}
              </defs>
              {L.paths.map(({ e, d, back, spineEdge }, i) => {
                const st = EDGE_STYLE[e.kind];
                const litEdge = isLit(e.parentId) && isLit(e.childId);
                const isUpEdge = active != null && (e.childId === active || up?.has(e.childId)) && (up?.has(e.parentId) ?? false);
                let stroke: string, w: number, op: number;
                if (back) {
                  stroke = "var(--color-clay)"; w = 1.2; op = litEdge ? 1 : 0.45;
                } else if (active) {
                  // a selected node lights its whole path; everything else fades
                  stroke = !litEdge ? "var(--color-hairline-2)" : isUpEdge ? "var(--color-ink-2)" : "var(--color-clay)";
                  w = litEdge ? 1.5 : 0.8; op = litEdge ? 1 : 0.16;
                } else {
                  // resting: spine ink + solid, branches faint + thin
                  stroke = spineEdge ? "var(--color-ink-2)" : "var(--color-hairline-2)";
                  w = spineEdge ? 1.2 : 0.85; op = spineEdge ? 0.92 : 0.5;
                }
                const marker = stroke.includes("clay") ? "ar-clay" : stroke.includes("ink") ? "ar-ink" : "ar-dim";
                return (
                  <g key={i}>
                    <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray={back ? "4 3" : st.dash} opacity={op} markerEnd={`url(#${marker})`} />
                    {back && <title>look-ahead leak — reads from a later stage</title>}
                    <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} onClick={() => onInspectEdge(e)}>
                      <title>{`${st.label} — inspect dependency`}</title>
                    </path>
                  </g>
                );
              })}
            </svg>

            {/* nodes */}
            {L.flow.map((n) => {
              const lit = isLit(n.id);
              const hero = L.isHero(n.id);
              if (hero) return <HeroCard key={n.id} id={n.id} heroRef={heroRef} L={L} spec={resultSpecs[n.id]} validator={nodeValidator(n.id)} label={labels[n.id] ?? n.name} lit={lit} selected={n.id === selectedId} building={n.id === inFlightId} sweep={sweep} sweepOpen={sweepOpen} onToggleSweep={() => setSweepOpen((o) => !o)} onInspect={() => onInspectNode(n.id)} onCompare={onCompare} setHover={setHover} />;
              const onSpine = L.spine.has(n.id);
              const isSelf = n.id === active;
              const isAncestor = up?.has(n.id) ?? false;
              const isDescendant = down?.has(n.id) ?? false;
              const isBuilding = n.id === inFlightId;
              const vg = variants[n.id];
              const knob = knobForOp(producerOps[n.id]);
              const policies = (n.policyRefs ?? []).map((pid) => labels[pid] ?? L.byId[pid]?.name ?? pid.split(":")[1]);
              const v = nodeValidator(n.id);
              const ring =
                n.id === selectedId ? "border-clay ring-2 ring-clay/40 ring-offset-2 ring-offset-white"
                : isSelf ? "border-clay"
                : isAncestor ? "border-ink-2 border-dashed"
                : isDescendant ? "border-clay/50"
                : onSpine ? "border-ink-2"
                : "border-hairline-2";
              const fill = isDescendant && active ? "bg-clay/[0.09]" : onSpine ? "bg-paper" : "bg-paper-2/50";
              return (
                <div
                  key={n.id}
                  ref={(el) => { nodeRefs.current[n.id] = el; }}
                  className={`group node-snap absolute flex flex-col overflow-hidden border transition-opacity ${fill} ${ring} ${lit ? "opacity-100" : "opacity-25"} ${isBuilding ? "node-building" : ""}`}
                  style={{ left: L.left(n.id), top: L.top(n.id), width: CARD_W, height: L.cardH(n.id), animationDelay: `${Math.min(laneOf(n.kind) * 50, 300)}ms` }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <button onClick={() => onInspectNode(n.id)} className="flex-1 w-full text-left px-2.5 py-1.5 hover:bg-paper-2/50 transition-colors">
                    {/* line 1 — the name (the lane header already names the kind) + trust */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[0.74rem] leading-tight truncate ${onSpine ? "text-ink" : "text-ink-2"}`}>{cleanName(labels[n.id] ?? n.name)}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {policies.length > 0 && <span title={policies.join(" · ")} className="text-[0.62rem] leading-none text-clay">⚖</span>}
                        {v && <TrustBadge validator={v} zoom="node" />}
                      </span>
                    </div>
                    {/* line 2 — operator · grain · downstream (always visible) */}
                    <div className="mt-0.5 flex items-center justify-between gap-1.5 font-mono text-[0.55rem] text-faint">
                      <span className="truncate">{isBuilding ? "building…" : producerOps[n.id] ?? n.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {L.grain[n.id] && <span>{L.grain[n.id]}</span>}
                        {L.feeds[n.id] > 0 && <span>↳{L.feeds[n.id]}</span>}
                      </span>
                    </div>
                  </button>
                  {/* action row — ALWAYS visible (fork / compare) */}
                  {vg ? (
                    <div className="shrink-0 flex border-t border-hairline bg-paper-2/40 font-mono text-[0.54rem]">
                      <button onClick={(e) => { e.stopPropagation(); onFork(n.id); }} className="px-2 py-0.5 text-clay border-r border-hairline hover:bg-clay hover:text-paper transition-colors" title={`fork ${vg.param}`}>⑂</button>
                      <button onClick={(e) => { e.stopPropagation(); onCompare(n.id); }} className="flex-1 flex items-center justify-between px-2 py-0.5 text-clay hover:bg-clay hover:text-paper transition-colors group/c">
                        <span>×{vg.members.length} {vg.param}</span>
                        <span className="text-faint group-hover/c:text-paper">compare →</span>
                      </button>
                    </div>
                  ) : knob ? (
                    <button onClick={(e) => { e.stopPropagation(); onFork(n.id); }} className="shrink-0 text-left border-t border-hairline px-2 py-0.5 bg-paper-2/40 font-mono text-[0.54rem] text-muted hover:bg-clay hover:text-paper transition-colors">
                      ⑂ fork · {knob.param}
                    </button>
                  ) : null}
                </div>
              );
            })}

            {/* sweep siblings — stacked beneath the hero, each its own hash */}
            {L.siblings.map((s, i) => {
              const v = s.validator;
              const lit = isLit(s.node.id);
              return (
                <button
                  key={s.node.id}
                  onClick={() => sweep && onCompare(sweep.baseId)}
                  className={`group absolute flex items-center gap-3 border border-hairline-2 bg-paper-2/60 px-3 text-left hover:border-clay transition-colors ${lit ? "opacity-100" : "opacity-40"}`}
                  style={{ left: L.left(L.heroId!) + (HERO_W - CARD_W) / 2, top: L.sibTop(i), width: CARD_W, height: SIB_H }}
                  title={`window ${s.value} · compare`}
                >
                  <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted shrink-0">{sweep?.param} {s.value}</span>
                  <span className="flex-1 min-w-0 text-[0.8rem] text-ink-2">
                    Sharpe <span className="text-ink"><Metric value={s.metrics.sharpe} format="ratio" validator={v} lineageHash={v.lineageHash} /></span>
                  </span>
                  <TrustBadge validator={v} zoom="node" />
                </button>
              );
            })}

            {/* contextual concept caption — the "explain" overlay, on the hovered node */}
            {explain && hover && L.byId[hover] && concepts[L.byId[hover].kind]?.what && (
              <div
                className="node-snap absolute z-20 border border-clay/40 bg-clay-wash px-2.5 py-1.5 text-[0.72rem] leading-snug text-ink-2"
                style={{ left: L.left(hover), top: L.top(hover) + L.cardH(hover) + 6, width: 248 }}
              >
                <span className="eyebrow text-clay block mb-0.5">{L.byId[hover].kind}</span>
                {concepts[L.byId[hover].kind].what}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* zoom controls — fixed to the viewport corner (outside the scroller) */}
      <div className="absolute bottom-3 right-3 z-30 flex items-stretch border border-hairline bg-paper font-mono text-[0.66rem] text-muted">
        <button onClick={() => setZoom((z) => clamp(z * 0.85))} title="zoom out" className="px-2.5 py-1 hover:bg-paper-2 hover:text-ink transition-colors">−</button>
        <button onClick={fit} title="fit to view" className="px-2.5 py-1 border-x border-hairline uppercase tracking-[0.1em] text-[0.58rem] hover:bg-paper-2 hover:text-ink transition-colors">fit</button>
        <button onClick={() => setZoom((z) => clamp(z * 1.18))} title="zoom in" className="px-2.5 py-1 hover:bg-paper-2 hover:text-ink transition-colors">+</button>
        <span className="grid place-items-center px-2 border-l border-hairline tabular-nums text-faint">{Math.round(zoom * 100)}%</span>
      </div>

      {/* minimap — the whole pipeline at a glance + the current viewport */}
      <Minimap L={L} zoom={zoom} vp={vp} onPan={(cxFrac, cyFrac) => {
        const el = scrollRef.current; if (!el) return;
        el.scrollTo({ left: cxFrac * L.width * zoom - el.clientWidth / 2, top: cyFrac * L.height * zoom - el.clientHeight / 2 });
      }} />
    </div>
  );
}

/* ── minimap ─────────────────────────────────────────────────────────────── */
function Minimap({
  L, zoom, vp, onPan,
}: {
  L: { flow: { id: string; kind: NodeKind }[]; spine: Set<string>; left: (id: string) => number; top: (id: string) => number; cardW: (id: string) => number; cardH: (id: string) => number; width: number; height: number };
  zoom: number;
  vp: { l: number; t: number; w: number; h: number };
  onPan: (cxFrac: number, cyFrac: number) => void;
}) {
  const MM_W = 150;
  const s = MM_W / L.width;
  const MM_H = Math.min(110, L.height * s);
  const sy = MM_H / L.height;
  // only worth showing when the content overflows the viewport
  if (vp.w >= L.width * zoom - 4 && vp.h >= L.height * zoom - 4) return null;
  return (
    <div
      className="absolute bottom-3 left-3 z-30 border border-hairline bg-paper/95 cursor-pointer"
      style={{ width: MM_W, height: MM_H }}
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onPan((e.clientX - r.left) / MM_W, (e.clientY - r.top) / MM_H);
      }}
      title="minimap — click to jump"
    >
      {L.flow.map((n) => (
        <div
          key={n.id}
          className={`absolute ${L.spine.has(n.id) ? "bg-ink-2" : "bg-hairline-2"}`}
          style={{ left: L.left(n.id) * s, top: L.top(n.id) * sy, width: Math.max(2, L.cardW(n.id) * s), height: Math.max(2, L.cardH(n.id) * sy) }}
        />
      ))}
      <div
        className="absolute border border-clay bg-clay/10"
        style={{ left: (vp.l / zoom) * s, top: (vp.t / zoom) * sy, width: (vp.w / zoom) * s, height: (vp.h / zoom) * sy }}
      />
    </div>
  );
}

/* ── the inline result hero ───────────────────────────────────────────────── */
function HeroCard({
  id, heroRef, L, spec, validator, label, lit, selected, building, sweep, sweepOpen, onToggleSweep, onInspect, onCompare, setHover,
}: {
  id: string;
  heroRef: React.RefObject<HTMLDivElement | null>;
  L: { left: (id: string) => number; top: (id: string) => number };
  spec: ResultSpec;
  validator?: Validator;
  label: string;
  lit: boolean;
  selected: boolean;
  building: boolean;
  sweep?: Sweep;
  sweepOpen: boolean;
  onToggleSweep: () => void;
  onInspect: () => void;
  onCompare: (id: string) => void;
  setHover: (id: string | null) => void;
}) {
  const m = spec.metrics;
  const ring = selected ? "border-clay ring-2 ring-clay/40 ring-offset-2 ring-offset-white" : "border-clay/60";
  return (
    <div
      ref={heroRef}
      className={`node-snap absolute overflow-hidden border bg-white ${ring} ${lit ? "opacity-100" : "opacity-30"} ${building ? "node-building" : ""}`}
      style={{ left: L.left(id), top: L.top(id), width: HERO_W }}
      onMouseEnter={() => setHover(id)}
      onMouseLeave={() => setHover(null)}
    >
      <button onClick={onInspect} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-clay">the finding</span>
          {validator && <TrustBadge validator={validator} zoom="node" />}
        </div>
        <p className="px-3 mt-0.5 mb-2 font-serif text-[0.94rem] leading-tight text-ink truncate">{cleanName(label)}</p>
        <div className="grid grid-cols-3 border-t border-hairline divide-x divide-hairline">
          {[
            { k: "Sharpe", v: m.sharpe, f: "ratio" as const },
            { k: "Hit", v: m.hit_rate, f: "number" as const },
            { k: "Ann.", v: m.ann_return, f: "signed-pct" as const },
          ].map((c) => (
            <div key={c.k} className="px-2 py-1.5">
              <div className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted">{c.k}</div>
              <div className="mt-0.5 text-[0.95rem] text-ink tabular-nums">
                <Metric value={c.v} format={c.f} validator={validator} lineageHash={validator?.lineageHash} />
              </div>
            </div>
          ))}
        </div>
      </button>
      {sweep && (
        <div className="flex border-t border-hairline bg-paper-2/40 font-mono text-[0.54rem]">
          <button onClick={onToggleSweep} className="px-2.5 py-1 text-clay border-r border-hairline hover:bg-clay hover:text-paper transition-colors">⑂{sweep.results.length} {sweepOpen ? "▾" : "▸"}</button>
          <button onClick={() => onCompare(sweep.baseId)} className="flex-1 flex items-center justify-between px-2.5 py-1 text-clay hover:bg-clay hover:text-paper transition-colors group/c">
            <span>{sweep.param} sweep</span>
            <span className="text-faint group-hover/c:text-paper">compare →</span>
          </button>
        </div>
      )}
    </div>
  );
}
