import type { LineageSubgraph, NodeKind } from "@/lib/types";

/**
 * Fig 1 — the research graph, rendered from a contract-shaped lineage
 * subgraph (Node[] + LineageEdge[]). Honest by construction: the data comes
 * from lib/data; this component owns only PRESENTATION (layout, human labels,
 * the operator verb shown on each edge). When a live lineage export replaces
 * the fixture, this component renders it unchanged.
 *
 * The graph reads left-to-right as a sentence across stage lanes:
 *   dataset → feature → matrix → target → model → result
 * with policies attached as governing (dashed) edges via row-level policyRefs.
 */

const W = 158;
const POLICY_W = 212; // policy ids are long — give them room
const H = 46;

// ── presentation: layout per node id (NOT contract data) ────────────
const POS: Record<string, { x: number; y: number; delay: number }> = {
  "dataset:crude_oil_1m": { x: 92, y: 122, delay: 0 },
  "dataset:nat_gas_1m": { x: 92, y: 228, delay: 0.1 },
  "dataset:heating_oil_1m": { x: 92, y: 334, delay: 0.2 },
  "feature:front_month_cont:v1": { x: 330, y: 122, delay: 0.7 },
  "feature:nat_gas_z20:v1": { x: 330, y: 228, delay: 0.8 },
  "feature:ulsd_z20:v1": { x: 330, y: 334, delay: 0.9 },
  "matrix:signal_matrix_v3:v3": { x: 580, y: 175, delay: 1.4 },
  "target:fwd_ret_5m:v1": { x: 580, y: 305, delay: 1.4 },
  "model:linreg_baseline:v1": { x: 840, y: 228, delay: 1.9 },
  "result:bt_2024_06_meanrev:v1": { x: 1078, y: 228, delay: 2.4 },
  "policy:roll_stitch_cl_calendar_panama:1": { x: 330, y: 38, delay: 0.4 },
  "policy:position_sizing_top_decile_long_short:1": { x: 1078, y: 38, delay: 0.4 },
};

// human label primary, mono id secondary (presentational — backend artifacts
// carry no row-level friendly_name/description field; see report).
const LABEL: Record<string, string> = {
  "dataset:crude_oil_1m": "WTI Crude Oil · 1m",
  "dataset:nat_gas_1m": "Henry Hub Gas · 1m",
  "dataset:heating_oil_1m": "NY Harbor ULSD · 1m",
  "feature:front_month_cont:v1": "Front-month continuous",
  "feature:nat_gas_z20:v1": "Gas z-score · 20",
  "feature:ulsd_z20:v1": "ULSD z-score · 20",
  "matrix:signal_matrix_v3:v3": "Signal matrix",
  "target:fwd_ret_5m:v1": "Forward return · 5m",
  "model:linreg_baseline:v1": "Linear baseline",
  "result:bt_2024_06_meanrev:v1": "Backtest · mean-rev",
  "policy:roll_stitch_cl_calendar_panama:1": "Roll & stitch",
  "policy:position_sizing_top_decile_long_short:1": "Position sizing",
};

// the real operator that produced each node (the verb on its inbound edges)
const PRODUCER_OP: Record<string, string> = {
  "feature:front_month_cont:v1": "stitch_contracts",
  "feature:nat_gas_z20:v1": "rolling_zscore",
  "feature:ulsd_z20:v1": "rolling_zscore",
  "matrix:signal_matrix_v3:v3": "join_feature",
  "target:fwd_ret_5m:v1": "lead",
  "model:linreg_baseline:v1": "fit_model",
  "result:bt_2024_06_meanrev:v1": "evaluate_strategy",
};

const KIND_TAG: Record<NodeKind, string> = {
  dataset: "DATASET",
  "raw-dataset": "DATASET",
  feature: "FEATURE",
  matrix: "MATRIX",
  target: "TARGET",
  model: "MODEL",
  result: "RESULT",
  policy: "POLICY",
  strategy: "STRATEGY",
  universe: "UNIVERSE",
  figure: "FIGURE",
  user_operator: "OPERATOR",
  operator: "OPERATOR",
};

function edgePath(p: { x: number; y: number }, c: { x: number; y: number }) {
  const x1 = p.x + W / 2;
  const x2 = c.x - W / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${p.y} C ${mx} ${p.y}, ${mx} ${c.y}, ${x2} ${c.y}`;
}

export function ResearchGraph({ subgraph }: { subgraph: LineageSubgraph }) {
  const { nodes, edges } = subgraph;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // governing (dashed) edges derived from row-level policyRefs — NOT lineage
  const governs = nodes.flatMap((n) =>
    (n.policyRefs ?? [])
      .filter((pid) => POS[pid] && POS[n.id])
      .map((pid) => ({ from: pid, to: n.id }))
  );

  return (
    <svg
      viewBox="0 0 1190 380"
      className="w-full h-auto"
      role="img"
      aria-label="Crude-oil research lineage: datasets crude_oil_1m, nat_gas_1m, heating_oil_1m become features via stitch_contracts and rolling_zscore, join into signal_matrix_v3, with target fwd_ret_5m via lead; fit_model produces linreg_baseline; evaluate_strategy produces result bt_2024_06_meanrev. Governed by policies roll_stitch_cl_calendar_panama and position_sizing_top_decile_long_short."
    >
      {/* governing edges (behind) */}
      {governs.map((g, i) => {
        const a = POS[g.from];
        const b = POS[g.to];
        return (
          <path
            key={`g${i}`}
            d={`M ${a.x} ${a.y + H / 2} L ${b.x} ${b.y - H / 2}`}
            fill="none"
            stroke="var(--color-clay)"
            strokeWidth={1.25}
            strokeDasharray="3 4"
            style={{ opacity: 0, animation: `pop 0.6s ease forwards ${b.delay + 0.1}s` }}
          />
        );
      })}

      {/* data lineage edges */}
      {edges.map((e, i) => {
        const p = POS[e.parentId];
        const c = POS[e.childId];
        if (!p || !c) return null;
        return (
          <path
            key={`e${i}`}
            d={edgePath(p, c)}
            fill="none"
            stroke="var(--color-hairline-2)"
            strokeWidth={1.25}
            strokeDasharray={1}
            pathLength={1}
            style={{
              strokeDashoffset: 1,
              animation: `draw 0.5s ease forwards ${Math.max(0, c.delay - 0.25)}s`,
            }}
          />
        );
      })}

      {/* operator verbs — one per produced node, at its inbound lane gap */}
      {nodes.map((n) => {
        const op = PRODUCER_OP[n.id];
        const c = POS[n.id];
        if (!op || !c) return null;
        const firstParent = edges.find((e) => e.childId === n.id);
        const p = firstParent ? POS[firstParent.parentId] : undefined;
        if (!p) return null;
        const lx = (p.x + W / 2 + (c.x - W / 2)) / 2;
        const ly = (p.y + c.y) / 2 - 7;
        return (
          <text
            key={`op${n.id}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="8"
            letterSpacing="0.02em"
            fill="var(--color-faint)"
            style={{ opacity: 0, animation: `pop 0.5s ease forwards ${c.delay}s` }}
          >
            {op}
          </text>
        );
      })}

      {/* nodes */}
      {nodes.map((n) => {
        const pos = POS[n.id];
        if (!pos) return null;
        const isPolicy = n.kind === "policy";
        const isResult = n.kind === "result";
        const accent = isResult || isPolicy;
        const w = isPolicy ? POLICY_W : W;
        const left = pos.x - w / 2;
        const top = pos.y - H / 2;
        return (
          <g
            key={n.id}
            style={{ opacity: 0, animation: `pop 0.55s cubic-bezier(0.22,1,0.36,1) forwards ${pos.delay}s` }}
          >
            <text
              x={left}
              y={top - 8}
              fontFamily="var(--font-mono)"
              fontSize="8.5"
              letterSpacing="0.16em"
              fill={accent ? "var(--color-clay)" : "var(--color-muted)"}
            >
              {KIND_TAG[n.kind]}
            </text>
            <rect
              x={left}
              y={top}
              width={w}
              height={H}
              rx={2}
              fill="var(--color-paper)"
              stroke={accent ? "var(--color-clay)" : "var(--color-hairline-2)"}
              strokeWidth={isResult ? 1.5 : 1}
              strokeDasharray={isPolicy ? "4 3" : undefined}
            />
            <text
              x={pos.x}
              y={pos.y - 2}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize="11.5"
              fontWeight={500}
              fill={isResult ? "var(--color-clay-deep)" : "var(--color-ink)"}
            >
              {LABEL[n.id] ?? n.name}
            </text>
            <text
              x={pos.x}
              y={pos.y + 12}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={isPolicy ? 8 : 9}
              fill="var(--color-muted)"
            >
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
