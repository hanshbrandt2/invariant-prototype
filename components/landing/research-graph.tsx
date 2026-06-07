"use client";

import type { LineageSubgraph, LineageEdge, NodeKind } from "@/lib/types";

/**
 * The research graph, rendered from a contract-shaped lineage subgraph.
 * Layout is computed (topological-depth columns → stage lanes), so the same
 * component renders the landing Fig.1, the dashboard card thumbnail, and the
 * workspace lineage hero. Honest by construction — data comes from lib/data;
 * this owns only presentation.
 */

type Variant = "hero" | "thumb";

interface Props {
  subgraph: LineageSubgraph;
  labels?: Record<string, string>;
  producerOps?: Record<string, string>;
  variant?: Variant;
  onEdgeClick?: (edge: LineageEdge) => void;
  className?: string;
}

const KIND_TAG: Partial<Record<NodeKind, string>> = {
  dataset: "DATASET",
  "raw-dataset": "DATASET",
  feature: "FEATURE",
  matrix: "MATRIX",
  target: "TARGET",
  model: "MODEL",
  result: "RESULT",
  policy: "POLICY",
  universe: "UNIVERSE",
  strategy: "STRATEGY",
  figure: "FIGURE",
  operator: "OPERATOR",
  user_operator: "OPERATOR",
};

const SIZE = {
  hero: { W: 150, H: 46, COL: 212, ROW: 116, MX: 26, TOP: 96, BOT: 30, POLICY_W: 210 },
  thumb: { W: 17, H: 9, COL: 31, ROW: 19, MX: 7, TOP: 9, BOT: 7, POLICY_W: 17 },
} as const;

interface Placed {
  id: string;
  x: number;
  y: number;
  depth: number;
}

function layout(sg: LineageSubgraph, v: Variant) {
  const S = SIZE[v];
  const isPolicy = (id: string) => sg.nodes.find((n) => n.id === id)?.kind === "policy";
  const flow = sg.nodes.filter((n) => n.kind !== "policy");
  const parents: Record<string, string[]> = {};
  for (const n of flow) parents[n.id] = [];
  for (const e of sg.edges) if (parents[e.childId] && !isPolicy(e.parentId)) parents[e.childId].push(e.parentId);

  // longest-path depth from roots
  const depth: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (depth[id] != null) return depth[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    const d = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    depth[id] = d;
    return d;
  };
  for (const n of flow) visit(n.id, new Set());

  // group by column, order rows by parent barycenter
  const maxDepth = Math.max(0, ...flow.map((n) => depth[n.id]));
  const cols: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const n of flow) cols[depth[n.id]].push(n.id);
  const rowOf: Record<string, number> = {};
  cols.forEach((col) => {
    col.sort((a, b) => {
      const ba = (parents[a] ?? []).reduce((s, p) => s + (rowOf[p] ?? 0), 0) / Math.max(1, parents[a]?.length);
      const bb = (parents[b] ?? []).reduce((s, p) => s + (rowOf[p] ?? 0), 0) / Math.max(1, parents[b]?.length);
      return (ba || 0) - (bb || 0);
    });
    col.forEach((id, r) => (rowOf[id] = r));
  });

  const maxRows = Math.max(1, ...cols.map((c) => c.length));
  const contentH = (maxRows - 1) * S.ROW + S.H;
  const midY = S.TOP + contentH / 2;
  const placed: Record<string, Placed> = {};
  cols.forEach((col, d) => {
    const k = col.length;
    col.forEach((id, r) => {
      placed[id] = {
        id,
        depth: d,
        x: S.MX + S.W / 2 + d * S.COL,
        y: midY + (r - (k - 1) / 2) * S.ROW,
      };
    });
  });

  // policies: above the node they govern
  const policyPos: Record<string, Placed> = {};
  for (const n of sg.nodes) {
    if (n.kind !== "policy") continue;
    const governed = sg.nodes.find((g) => g.policyRefs?.includes(n.id) && placed[g.id]);
    const gx = governed ? placed[governed.id].x : S.MX + S.W / 2;
    policyPos[n.id] = { id: n.id, depth: 0, x: gx, y: S.TOP / 2 + 4 };
  }

  const width = S.MX * 2 + S.W + maxDepth * S.COL;
  const height = S.TOP + contentH + S.BOT;
  return { S, placed, policyPos, width, height, depthOf: depth };
}

function edgePath(p: Placed, c: Placed, halfW: number) {
  const x1 = p.x + halfW;
  const x2 = c.x - halfW;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${p.y} C ${mx} ${p.y}, ${mx} ${c.y}, ${x2} ${c.y}`;
}

export function ResearchGraph({
  subgraph,
  labels = {},
  producerOps = {},
  variant = "hero",
  onEdgeClick,
  className = "",
}: Props) {
  const { S, placed, policyPos, width, height, depthOf } = layout(subgraph, variant);
  const hero = variant === "hero";
  const half = S.W / 2;

  const governs = subgraph.nodes.flatMap((n) =>
    (n.policyRefs ?? [])
      .filter((pid) => policyPos[pid] && placed[n.id])
      .map((pid) => ({ from: pid, to: n.id }))
  );

  const nodeDelay = (id: string) => (depthOf[id] ?? 0) * 0.4 + (placed[id]?.y ?? 0) / 1400;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Research lineage graph"
    >
      {/* governing (dashed) edges */}
      {hero &&
        governs.map((g, i) => {
          const a = policyPos[g.from];
          const b = placed[g.to];
          return (
            <path
              key={`g${i}`}
              d={`M ${a.x} ${a.y + S.H / 2} L ${b.x} ${b.y - S.H / 2}`}
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth={1.25}
              strokeDasharray="3 4"
              style={{ opacity: 0, animation: `pop 0.6s ease forwards ${nodeDelay(g.to) + 0.1}s` }}
            />
          );
        })}

      {/* data edges */}
      {subgraph.edges.map((e, i) => {
        const p = placed[e.parentId];
        const c = placed[e.childId];
        if (!p || !c) return null;
        const d = edgePath(p, c, half);
        return (
          <g key={`e${i}`}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-hairline-2)"
              strokeWidth={hero ? 1.25 : 1}
              strokeDasharray={hero ? 1 : undefined}
              pathLength={hero ? 1 : undefined}
              style={hero ? { strokeDashoffset: 1, animation: `draw 0.5s ease forwards ${Math.max(0, nodeDelay(e.childId) - 0.2)}s` } : undefined}
            />
            {hero && onEdgeClick && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: "pointer" }}
                onClick={() => onEdgeClick(e)}
              >
                <title>how it was built</title>
              </path>
            )}
          </g>
        );
      })}

      {/* operator verbs (hero only) */}
      {hero &&
        subgraph.nodes.map((n) => {
          const op = producerOps[n.id];
          const c = placed[n.id];
          if (!op || !c) return null;
          const fp = subgraph.edges.find((e) => e.childId === n.id);
          const p = fp ? placed[fp.parentId] : undefined;
          if (!p) return null;
          return (
            <text
              key={`op${n.id}`}
              x={(p.x + half + (c.x - half)) / 2}
              y={(p.y + c.y) / 2 - 7}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="8"
              letterSpacing="0.02em"
              fill="var(--color-faint)"
              style={{ opacity: 0, animation: `pop 0.5s ease forwards ${nodeDelay(n.id)}s` }}
            >
              {op}
            </text>
          );
        })}

      {/* nodes (+ policies) */}
      {[...subgraph.nodes].map((n) => {
        const pos = n.kind === "policy" ? policyPos[n.id] : placed[n.id];
        if (!pos) return null;
        const isPolicy = n.kind === "policy";
        const isResult = n.kind === "result";
        const accent = isResult || isPolicy;
        const w = isPolicy ? S.POLICY_W : S.W;
        const left = pos.x - w / 2;
        const top = pos.y - S.H / 2;
        const delay = isPolicy ? 0.3 : nodeDelay(n.id);

        if (!hero) {
          // thumbnail: shape only, no text
          return (
            <rect
              key={n.id}
              x={left}
              y={top}
              width={w}
              height={S.H}
              rx={2}
              fill={isResult ? "var(--color-clay)" : n.kind === "dataset" ? "var(--color-ink-2)" : "var(--color-paper)"}
              stroke={isResult ? "var(--color-clay)" : "var(--color-hairline-2)"}
              strokeWidth={1}
            />
          );
        }

        return (
          <g key={n.id} style={{ opacity: 0, animation: `pop 0.55s cubic-bezier(0.22,1,0.36,1) forwards ${delay}s` }}>
            <text x={left} y={top - 8} fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="0.16em" fill={accent ? "var(--color-clay)" : "var(--color-muted)"}>
              {KIND_TAG[n.kind]}
            </text>
            <rect
              x={left}
              y={top}
              width={w}
              height={S.H}
              rx={2}
              fill="var(--color-paper)"
              stroke={accent ? "var(--color-clay)" : "var(--color-hairline-2)"}
              strokeWidth={isResult ? 1.5 : 1}
              strokeDasharray={isPolicy ? "4 3" : undefined}
            />
            <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11.5" fontWeight={500} fill={isResult ? "var(--color-clay-deep)" : "var(--color-ink)"}>
              {labels[n.id] ?? n.name}
            </text>
            <text x={pos.x} y={pos.y + 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={isPolicy ? 8 : 9} fill="var(--color-muted)">
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
