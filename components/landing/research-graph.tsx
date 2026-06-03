/**
 * The signature visual: a connected research graph that draws itself in,
 * echoing the workspace's "watch it build". Pure SVG + CSS, flat, hairline.
 * Names + kinds mirror the crude-oil fixture graph.
 */

type GNode = {
  id: string;
  kind: string;
  name: string;
  cx: number;
  cy: number;
  accent?: boolean;
  delay: number;
};

type GEdge = {
  d: string;
  delay: number;
  label?: string;
  lx?: number;
  ly?: number;
  dashed?: boolean;
};

const W = 156;
const H = 50;

const NODES: GNode[] = [
  { id: "n1", kind: "DATASET", name: "crude_oil_1m", cx: 98, cy: 180, delay: 0 },
  { id: "n2", kind: "FEATURE", name: "front_month_cont", cx: 318, cy: 180, delay: 0.5 },
  { id: "n3", kind: "MATRIX", name: "signal_matrix_v3", cx: 538, cy: 180, delay: 1.0 },
  { id: "n4", kind: "MODEL", name: "linreg_baseline", cx: 758, cy: 180, delay: 1.6 },
  { id: "t", kind: "TARGET", name: "fwd_ret_5m", cx: 538, cy: 66, delay: 1.2 },
  { id: "p", kind: "POLICY", name: "roll:wti:v3", cx: 318, cy: 296, delay: 1.2 },
  { id: "n5", kind: "RESULT", name: "bt_2024_06_meanrev", cx: 968, cy: 180, accent: true, delay: 2.1 },
];

const EDGES: GEdge[] = [
  { d: "M 176 180 H 240", delay: 0.3, label: "stitch", lx: 208, ly: 170 },
  { d: "M 396 180 H 460", delay: 0.8, label: "build", lx: 428, ly: 170 },
  { d: "M 616 180 H 680", delay: 1.4, label: "fit", lx: 648, ly: 170 },
  { d: "M 836 180 H 890", delay: 1.9, label: "backtest", lx: 863, ly: 170 },
  // target feeds the model
  { d: "M 538 91 C 538 140, 620 130, 690 165", delay: 1.5 },
  // policy governs the feature (dashed)
  { d: "M 318 271 V 205", delay: 1.5, dashed: true, label: "governs", lx: 352, ly: 240 },
];

export function ResearchGraph() {
  return (
    <svg
      viewBox="0 0 1066 340"
      className="w-full h-auto"
      role="img"
      aria-label="A connected research graph: crude_oil_1m to front_month_cont to signal_matrix_v3 to linreg_baseline to bt_2024_06_meanrev, governed by policy roll:wti:v3."
    >
      {/* edges */}
      {EDGES.map((e, i) => (
        <g key={`e${i}`}>
          <path
            d={e.d}
            fill="none"
            stroke={e.dashed ? "var(--color-clay)" : "var(--color-hairline-2)"}
            strokeWidth={1.25}
            strokeDasharray={e.dashed ? "3 4" : 1}
            pathLength={1}
            style={
              e.dashed
                ? { opacity: 0, animation: `pop 0.6s ease forwards ${e.delay}s` }
                : {
                    strokeDashoffset: 1,
                    animation: `draw 0.55s ease forwards ${e.delay}s`,
                  }
            }
          />
          {e.label && (
            <text
              x={e.lx}
              y={e.ly}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="8.5"
              letterSpacing="0.12em"
              fill="var(--color-faint)"
              style={{ opacity: 0, animation: `pop 0.5s ease forwards ${e.delay + 0.2}s` }}
            >
              {e.label}
            </text>
          )}
        </g>
      ))}

      {/* nodes */}
      {NODES.map((n) => (
        <g
          key={n.id}
          style={{ opacity: 0, animation: `pop 0.6s cubic-bezier(0.22,1,0.36,1) forwards ${n.delay}s` }}
        >
          <text
            x={n.cx - W / 2}
            y={n.cy - H / 2 - 9}
            fontFamily="var(--font-mono)"
            fontSize="9"
            letterSpacing="0.16em"
            fill={n.accent ? "var(--color-clay)" : "var(--color-muted)"}
          >
            {n.kind}
          </text>
          <rect
            x={n.cx - W / 2}
            y={n.cy - H / 2}
            width={W}
            height={H}
            rx={2}
            fill="var(--color-paper)"
            stroke={n.accent ? "var(--color-clay)" : "var(--color-hairline-2)"}
            strokeWidth={n.accent ? 1.5 : 1}
          />
          <text
            x={n.cx}
            y={n.cy + 4}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="12.5"
            fill={n.accent ? "var(--color-clay-deep)" : "var(--color-ink)"}
          >
            {n.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
